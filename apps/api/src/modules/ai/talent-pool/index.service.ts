import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CvParseStatus, Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { lockCandidateContacts, normalizeEmail, normalizeLinkedinUrl, normalizePhone } from "../../candidates/contact";
import { PrismaService } from "../../prisma";
import { prepareCvTextForAi } from "../cv/cleaner";
import { CvTextExtractorService } from "../cv/extractor/index.service";
import { AI_PROVIDER, type AiProvider } from "../../../models/ai";
import { parseCvProfileFromText } from "../profile-parser";
import { CV_SUMMARY_PROMPT_VERSION } from "../prompts";
import { sanitizeCvSummary } from "../cv/sanitize";

const EXTRACTION_VERSION = "talent-pool-extraction-v2";
const MAX_AI_CV_CHARACTERS = 45_000;

@Injectable()
export class TalentPoolProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textExtractor: CvTextExtractorService,
    private readonly configService: ConfigService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  private get aiEnabled() {
    return (this.configService.get<string>("AI_PROVIDER") ?? "disabled") === "groq";
  }

  async processPoolEntry(entryId: string): Promise<void> {
    const entry = await this.prisma.talentPoolEntry.findUnique({
      where: { id: entryId },
      include: { file: true, candidate: true },
    });

    if (!entry?.file) {
      throw new Error("Talent pool entry or CV file not found");
    }

    await this.prisma.talentPoolEntry.update({
      where: { id: entryId },
      data: { status: CvParseStatus.EXTRACTING, errorMessage: null },
    });

    try {
      const extracted = await this.textExtractor.extract({
        originalName: entry.file.originalName,
        mimeType: entry.file.mimeType,
        path: entry.file.path,
      });
      const regex = parseCvProfileFromText(extracted.text);
      const structuredData: Record<string, unknown> = {
        source: "ta_upload",
        parser: extracted.parser,
        extractionVersion: EXTRACTION_VERSION,
        qualityScore: extracted.qualityScore,
        ...(extracted.ocrConfidence === undefined ? {} : { ocrConfidence: extracted.ocrConfidence }),
        ...(extracted.lowConfidenceOcr ? { lowConfidenceOcr: true } : {}),
        ...(extracted.ocrTruncated ? { ocrTruncated: true } : {}),
        ...(extracted.totalPages === undefined ? {} : { totalPages: extracted.totalPages }),
        ...(regex.email ? { email: regex.email } : {}),
        ...(regex.phone ? { phone: regex.phone } : {}),
        ...(regex.normalizedPhone ? { normalizedPhone: regex.normalizedPhone } : {}),
        ...(regex.fullName ? { fullName: regex.fullName, fullNameSource: "cv_text" } : {}),
        ...(regex.title ? { title: regex.title, titleSource: "cv_text" } : {}),
        ...(regex.skills?.length ? { skills: regex.skills, skillsSource: "cv_text" } : {}),
        ...(regex.linkedinUrl ? { linkedinUrl: regex.linkedinUrl } : {}),
        ...(regex.portfolioUrl ? { portfolioUrl: regex.portfolioUrl } : {}),
      };

      let extractedFullName = regex.fullName;
      if (this.aiEnabled) {
        const aiReadyCv = prepareCvTextForAi(extracted.text, MAX_AI_CV_CHARACTERS);
        structuredData.aiInput = {
          sourceCharacters: aiReadyCv.sourceCharacters,
          cleanedCharacters: aiReadyCv.cleanedCharacters,
          redactionCount: aiReadyCv.redactionCount,
          truncated: aiReadyCv.truncated,
        };

        try {
          const profile = await this.aiProvider.extractProfile({
            cvText: aiReadyCv.text,
            fileName: entry.file.originalName,
          });
          if (profile.fullName?.trim()) {
            extractedFullName = profile.fullName.trim();
            structuredData.fullName = extractedFullName;
            structuredData.fullNameSource = "ai";
          }
          if (profile.title?.trim()) {
            structuredData.title = profile.title.trim();
            structuredData.titleSource = "ai";
          }
          if (profile.yearsExperience !== null) structuredData.yearsExperience = profile.yearsExperience;
          if (profile.skills.length) {
            structuredData.skills = profile.skills;
            structuredData.skillsSource = "ai";
          }
          if (profile.languages.length) structuredData.languages = profile.languages;
          structuredData.aiEnriched = true;
        } catch {
          structuredData.aiEnriched = false;
        }

        try {
          structuredData.cvSummary = sanitizeCvSummary(await this.aiProvider.summarizeCv({
            cvText: aiReadyCv.text,
          }));
          structuredData.cvSummaryPromptVersion = CV_SUMMARY_PROMPT_VERSION;
        } catch {
          structuredData.cvSummaryUnavailable = true;
        }
      }

      await this.prisma.$transaction(async tx => {
        const candidateId = await this.resolveCandidate(tx, {
          currentCandidate: entry.candidate,
          email: regex.email,
          phone: regex.phone,
          linkedinUrl: regex.linkedinUrl,
          portfolioUrl: regex.portfolioUrl,
          fullName: extractedFullName,
        });

        await tx.talentPoolEntry.update({
          where: { id: entryId },
          data: {
            candidateId,
            status: CvParseStatus.COMPLETED,
            extractedText: extracted.text,
            structuredData: structuredData as Prisma.InputJsonObject,
            summary: "Đã trích xuất nội dung CV. Bổ sung tên/kỹ năng nếu cần.",
            errorMessage: null,
          },
        });

        if (candidateId !== entry.candidateId) {
          await tx.activityLog.updateMany({
            where: { candidateId: entry.candidateId },
            data: { candidateId },
          });
          await tx.candidate.delete({ where: { id: entry.candidateId } });
        }
      });
    } catch (error) {
      await this.markPoolFailed(entryId, error);
      throw error;
    }
  }

  async markPoolFailed(entryId: string, error: unknown) {
    await this.prisma.talentPoolEntry.update({
      where: { id: entryId },
      data: {
        status: CvParseStatus.FAILED,
        summary: "Không thể trích xuất nội dung CV tự động. Bạn vẫn có thể xem CV và nhập thông tin thủ công.",
        errorMessage: error instanceof Error ? error.message : "Unknown extraction error",
      },
    });
  }

  private async resolveCandidate(
    tx: Prisma.TransactionClient,
    input: {
      currentCandidate: {
        id: string;
        fullName: string;
        email: string | null;
        normalizedEmail: string | null;
        phone: string | null;
        normalizedPhone: string | null;
        linkedinUrl: string | null;
        normalizedLinkedinUrl: string | null;
        portfolioUrl: string | null;
      };
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      fullName?: string;
    },
  ) {
    const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedLinkedinUrl = normalizeLinkedinUrl(input.linkedinUrl);
    await lockCandidateContacts(tx, normalizedEmail, normalizedPhone, normalizedLinkedinUrl);

    const filters: Prisma.CandidateWhereInput[] = [];
    if (normalizedEmail) filters.push({ normalizedEmail });
    if (normalizedPhone) filters.push({ normalizedPhone });
    if (normalizedLinkedinUrl) filters.push({ normalizedLinkedinUrl });
    const matches = filters.length
      ? await tx.candidate.findMany({
          where: { id: { not: input.currentCandidate.id }, OR: filters },
          orderBy: { createdAt: "asc" },
          take: 2,
        })
      : [];

    if (matches.length > 1 && matches[0].id !== matches[1].id) {
      throw new BadRequestException("Email, số điện thoại hoặc LinkedIn đang khớp với hai hồ sơ ứng viên khác nhau.");
    }

    const target = matches[0] ?? input.currentCandidate;
    await tx.candidate.update({
      where: { id: target.id },
      data: {
        ...(!target.email && input.email ? { email: input.email, normalizedEmail } : {}),
        ...(!target.phone && input.phone ? { phone: input.phone, normalizedPhone } : {}),
        ...(!target.linkedinUrl && input.linkedinUrl ? { linkedinUrl: input.linkedinUrl, normalizedLinkedinUrl } : {}),
        ...(!target.portfolioUrl && input.portfolioUrl ? { portfolioUrl: input.portfolioUrl } : {}),
        ...(target.id === input.currentCandidate.id && input.fullName ? { fullName: input.fullName } : {}),
      },
    });
    return target.id;
  }
}

