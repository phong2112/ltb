import type { MulterModuleOptions } from "@nestjs/platform-express";
import { maxTalentPoolCvFiles } from "@hr-copilot/shared";
import { createCvMulterUploadOptions } from "@/modules/files/upload-options";

export function createTalentPoolUploadOptions(maxSizeMb: number): MulterModuleOptions {
  return createCvMulterUploadOptions(maxSizeMb, maxTalentPoolCvFiles);
}
