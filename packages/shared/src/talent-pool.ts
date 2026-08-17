export const talentPoolUploadStatuses = ["created", "duplicate", "error"] as const;
export type TalentPoolUploadStatus = (typeof talentPoolUploadStatuses)[number];

export type TalentPoolUploadResult = {
  fileName: string;
  status: TalentPoolUploadStatus;
  entryId?: string;
  reason?: string;
};
