import { BadRequestException } from "@nestjs/common";
import type { MulterModuleOptions } from "@nestjs/platform-express";
import { isAllowedCvExtension, isAllowedCvMimeType } from "@hr-copilot/shared";
import { memoryStorage } from "multer";
import { extname } from "node:path";

export function createCvMulterUploadOptions(maxSizeMb: number, maxFiles: number): MulterModuleOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: maxFiles },
    fileFilter: (_request, file, callback) => {
      if (
        !isAllowedCvExtension(extname(file.originalname)) ||
        !isAllowedCvMimeType(file.mimetype)
      ) {
        callback(
          new BadRequestException("CV phải là tệp PDF, DOC, DOCX, JPG hoặc PNG."),
          false,
        );
        return;
      }

      callback(null, true);
    },
  };
}
