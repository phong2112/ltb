import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { extname } from "node:path";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ApplicationsService } from "./applications.service";

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

function hasAllowedFileSignature(file: Express.Multer.File) {
  const extension = extname(file.originalname).toLowerCase();
  const bytes = file.buffer.subarray(0, 8);

  if (extension === ".pdf") {
    return bytes.subarray(0, 4).toString("ascii") === "%PDF";
  }

  if (extension === ".doc") {
    return bytes.length >= 8 && bytes.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }

  if (extension === ".docx") {
    const zipSignature = bytes.subarray(0, 4);
    return zipSignature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || zipSignature.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) || zipSignature.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]));
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (extension === ".png") {
    return bytes.length >= 8 && bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return false;
}
