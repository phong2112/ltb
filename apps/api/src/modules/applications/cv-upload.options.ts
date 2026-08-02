import type { MulterModuleOptions } from "@nestjs/platform-express";
import { maxApplicationCvFiles } from "@hr-copilot/shared";
import { createCvMulterUploadOptions } from "../files/cv-upload-options.util";

export function createCvUploadOptions(maxSizeMb: number): MulterModuleOptions {
  return createCvMulterUploadOptions(maxSizeMb, maxApplicationCvFiles);
}
