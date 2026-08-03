import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { hasAllowedFileSignature } from "../../files/signature";
import { CreateApplicationDto } from "../dto/create/index.dto";
import { ApplicationsService } from "../service/index.service";

@ApiTags("Applications")
@Controller("applications")
@UseGuards(ThrottlerGuard)
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: "Submit a candidate application" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["jobId", "fullName", "email", "phone", "applicationArea", "consentAccepted"],
      properties: {
        jobId: { type: "string", example: "cmjob123" },
        fullName: { type: "string", example: "Nguyen Van A" },
        email: {
          type: "string",
          example: "candidate@example.com",
          format: "email",
        },
        phone: { type: "string", example: "0901234567" },
        applicationArea: { type: "string", example: "Hà Nội" },
        linkedinUrl: {
          type: "string",
          example: "https://www.linkedin.com/in/candidate",
        },
        portfolioUrl: { type: "string", example: "https://candidate.dev" },
        salaryExpectation: { type: "string", example: "25,000,000 VND" },
        noticePeriod: { type: "string", example: "30 days" },
        screeningAnswers: {
          type: "string",
          example: "I have 4 years of React and TypeScript experience.",
        },
        questionAnswers: {
          type: "string",
          description: "JSON array of screening question answers.",
          example: JSON.stringify([{ questionId: "cmquestion123", answer: "4 years" }]),
        },
        consentAccepted: { type: "boolean", example: true },
        cv: {
          type: "string",
          format: "binary",
          description: "Optional when portfolioUrl is provided. Accepts PDF, DOC, DOCX, JPG, or PNG.",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Application submission result." })
  @ApiBadRequestResponse({
    description: "Invalid form data, consent, file type, or file size.",
  })
  @ApiConflictResponse({
    description: "Candidate has already applied to this job with the same email or phone.",
  })
  @Post()
  @UseInterceptors(FileInterceptor("cv"))
  async createApplication(@Body() dto: CreateApplicationDto, @UploadedFile() cv?: Express.Multer.File) {
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;

    if (!dto.consentAccepted) {
      throw new BadRequestException("Bạn cần đồng ý cho phép xử lý thông tin ứng tuyển.");
    }

    if (!cv && !dto.portfolioUrl?.trim()) {
      throw new BadRequestException("Vui lòng tải CV hoặc cung cấp liên kết CV/portfolio.");
    }

    if (cv && cv.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Tệp CV không được vượt quá ${maxSizeMb} MB.`);
    }

    if (cv && !hasAllowedFileSignature(cv)) {
      throw new BadRequestException("Nội dung tệp CV không đúng định dạng PDF, DOC, DOCX, JPG hoặc PNG.");
    }

    return this.applicationsService.createApplication(dto, cv);
  }
}
