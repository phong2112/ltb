import { BadRequestException } from "@nestjs/common";
import type { MulterModuleOptions } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "node:path";

const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_CV_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

export function createCvUploadOptions(maxSizeMb: number): MulterModuleOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();

      if (
        !ALLOWED_CV_EXTENSIONS.has(extension) ||
        !ALLOWED_CV_MIME_TYPES.has(file.mimetype)
      ) {
        callback(
          new BadRequestException("CV must be a PDF, DOC, or DOCX file"),
          false,
        );
        return;
      }

      callback(null, true);
    },
  };
}
