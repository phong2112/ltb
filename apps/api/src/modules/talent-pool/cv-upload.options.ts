import type { MulterModuleOptions } from "@nestjs/platform-express";
import { maxTalentPoolCvFiles } from "@hr-copilot/shared";
import { createCvMulterUploadOptions } from "../files/cv-upload-options.util";

export function createTalentPoolUploadOptions(maxSizeMb: number): MulterModuleOptions {
  return createCvMulterUploadOptions(maxSizeMb, maxTalentPoolCvFiles);
}
