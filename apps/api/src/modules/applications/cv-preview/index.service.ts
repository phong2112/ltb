import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationAreas, type ApplicationArea } from "@hr-copilot/shared";
import { CvTextExtractorService } from "../../ai/cv/extractor/index.service";
import { parseCvProfileFromText } from "../../ai/profile-parser";
import { normalizePhone } from "../../candidates/contact";
import { hasAllowedFileSignature } from "../../files/signature";
import { ApplicationCvPreviewAiService } from "./ai.service";

type CvPreviewOptions = {
  allowedApplicationAreas?: string[];
};

@Injectable()
export class ApplicationCvPreviewService {
  constructor(
    private readonly configService: ConfigService,
    private readonly textExtractor: CvTextExtractorService,
    private readonly previewAiService: ApplicationCvPreviewAiService,
  ) {}

  async preview(file?: Express.Multer.File, options: CvPreviewOptions = {}) {
    if (!file) {
      throw new BadRequestException("Vui lòng tải CV để hệ thống gợi ý thông tin.");
    }

    this.validateFile(file);

    let extracted: Awaited<ReturnType<CvTextExtractorService["extract"]>>;
    try {
      extracted = await this.textExtractor.extract({
        originalName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
      });
    } catch {
      throw new BadRequestException("Chưa đọc được thông tin từ CV này. Vui lòng nhập thủ công.");
    }
    const profile = parseCvProfileFromText(extracted.text);
    const allowedApplicationAreas = normalizeAllowedApplicationAreas(options.allowedApplicationAreas);
    const regexApplicationArea = extractApplicationAreaFromText(extracted.text, allowedApplicationAreas);
    const aiPreview = await this.previewAiService.extract({
      cvText: extracted.text,
      fileName: file.originalname,
      allowedApplicationAreas,
    });
    const fullName = aiPreview?.fullName && aiPreview.confidence.fullName >= 0.7
      ? aiPreview.fullName
      : profile.fullName;
    const email = profile.email ?? (aiPreview?.email && aiPreview.confidence.email >= 0.85 ? aiPreview.email : undefined);
    const phone = profile.phone ?? (aiPreview?.phone && aiPreview.confidence.phone >= 0.75 ? aiPreview.phone : undefined);
    const normalizedPhone = profile.normalizedPhone ?? normalizePhone(phone);
    const applicationArea = aiPreview?.applicationArea && aiPreview.confidence.applicationArea >= 0.7
      ? aiPreview.applicationArea
      : regexApplicationArea;

    return {
      profile: {
        ...(fullName ? { fullName } : {}),
        ...(profile.title ? { title: profile.title } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(normalizedPhone ? { normalizedPhone } : {}),
        ...(profile.skills?.length ? { skills: profile.skills } : {}),
        ...(profile.linkedinUrl ? { linkedinUrl: profile.linkedinUrl } : {}),
        ...(profile.portfolioUrl ? { portfolioUrl: profile.portfolioUrl } : {}),
        ...(applicationArea ? { applicationArea } : {}),
      },
      metadata: {
        parser: extracted.parser,
        qualityScore: extracted.qualityScore,
        profileSource: aiPreview ? "regex+gemini" : "regex",
        ...(aiPreview ? {
          confidence: aiPreview.confidence,
          evidence: aiPreview.evidence,
        } : {}),
        ...(extracted.lowConfidenceOcr ? { lowConfidenceOcr: true } : {}),
      },
    };
  }

  private validateFile(file: Express.Multer.File) {
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;

    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Tệp CV không được vượt quá ${maxSizeMb} MB.`);
    }

    if (!hasAllowedFileSignature(file)) {
      throw new BadRequestException("Nội dung tệp CV không đúng định dạng PDF, DOC, DOCX, JPG hoặc PNG.");
    }
  }
}

const APPLICATION_AREA_ALIASES: Record<ApplicationArea, string[]> = {
  "Hà Nội": ["hà nội", "ha noi", "hanoi"],
  "Đà Nẵng": ["đà nẵng", "da nang", "danang"],
  "Hải Phòng": ["hải phòng", "hai phong", "haiphong"],
  "Quảng Ninh": ["quảng ninh", "quang ninh"],
  "TP Hồ Chí Minh": ["tp hồ chí minh", "tp. hồ chí minh", "thành phố hồ chí minh", "ho chi minh", "hồ chí minh", "hcm", "tphcm", "tp hcm", "sài gòn", "sai gon", "saigon"],
  Remote: ["remote", "từ xa", "tu xa", "work from home", "wfh"],
};

function extractApplicationAreaFromText(text: string, allowedApplicationAreas: ApplicationArea[]): ApplicationArea | undefined {
  const normalizedText = normalizeAreaSearchText(text).slice(0, 5_000);
  let bestMatch: { area: ApplicationArea; index: number } | undefined;

  for (const area of allowedApplicationAreas) {
    for (const alias of APPLICATION_AREA_ALIASES[area]) {
      const index = findAliasIndex(normalizedText, normalizeAreaSearchText(alias));
      if (index === -1) continue;
      if (!bestMatch || index < bestMatch.index) {
        bestMatch = { area, index };
      }
    }
  }

  return bestMatch?.area;
}

function normalizeAllowedApplicationAreas(areas: string[] | undefined): ApplicationArea[] {
  const normalized = (areas ?? [])
    .filter((area): area is ApplicationArea => applicationAreas.includes(area as ApplicationArea));

  return normalized.length ? normalized : [...applicationAreas];
}

function findAliasIndex(text: string, alias: string) {
  if (alias.length <= 4) {
    return text.search(new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, "i"));
  }

  return text.indexOf(alias);
}

function normalizeAreaSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
