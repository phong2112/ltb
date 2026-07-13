import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { extname } from "node:path";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ApplicationsService } from "./applications.service";

const allowedMimeTypes = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([".pdf", ".doc", ".docx"]);

@ApiTags("Applications")
@Controller("applications")
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
        email: { type: "string", example: "candidate@example.com", format: "email" },
        phone: { type: "string", example: "0901234567" },
        applicationArea: { type: "string", example: "Hà Nội" },
        linkedinUrl: { type: "string", example: "https://www.linkedin.com/in/candidate" },
        portfolioUrl: { type: "string", example: "https://candidate.dev" },
        salaryExpectation: { type: "string", example: "25,000,000 VND" },
        noticePeriod: { type: "string", example: "30 days" },
        screeningAnswers: { type: "string", example: "I have 4 years of React and TypeScript experience." },
        consentAccepted: { type: "boolean", example: true },
        cv: {
          type: "string",
          format: "binary",
          description: "Optional when portfolioUrl is provided. Accepts PDF, DOC, or DOCX.",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Application submission result." })
  @ApiBadRequestResponse({ description: "Invalid form data, consent, file type, or file size." })
  @Post()
  @UseInterceptors(
    FileInterceptor("cv", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();

        if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
          cb(new BadRequestException("CV must be a PDF, DOC, or DOCX file"), false);
          return;
        }

        cb(null, true);
      },
    }),
  )
  async createApplication(@Body() dto: CreateApplicationDto, @UploadedFile() cv?: Express.Multer.File) {
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;

    if (!dto.consentAccepted) {
      throw new BadRequestException("Candidate consent is required");
    }

    if (!cv && !dto.portfolioUrl?.trim()) {
      throw new BadRequestException("CV file or CV/portfolio link is required");
    }

    if (cv && cv.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`CV file must be ${maxSizeMb} MB or smaller`);
    }

    if (cv && !hasAllowedFileSignature(cv)) {
      throw new BadRequestException("CV file content does not match an allowed PDF, DOC, or DOCX file");
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
    return (
      zipSignature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
      zipSignature.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
      zipSignature.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
    );
  }

  return false;
}
