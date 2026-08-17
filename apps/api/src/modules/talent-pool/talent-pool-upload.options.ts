import type { MulterModuleOptions } from "@nestjs/platform-express";
import { maxTalentPoolCvFiles } from "@hr-copilot/shared";
import { createCvMulterUploadOptions } from "../files/upload-options";

export function createTalentPoolUploadOptions(maxSizeMb: number): MulterModuleOptions {
  return createCvMulterUploadOptions(maxSizeMb, maxTalentPoolCvFiles);
}
