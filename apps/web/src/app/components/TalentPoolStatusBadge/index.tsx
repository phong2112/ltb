import type { TalentPoolStatus } from "@hr-copilot/shared";

export function TalentPoolStatusBadge({ status, language }: { status: TalentPoolStatus; language: "vi" | "en" }) {
  const tone =
    status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAILED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "EXTRACTING" || status === "ANALYZING"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${tone}`}>
      {statusLabel(status, language)}
    </span>
  );
}

function statusLabel(status: TalentPoolStatus, language: "vi" | "en") {
  const labels = language === "vi"
    ? { PENDING: "Đang chờ", EXTRACTING: "Đang trích xuất", EXTRACTED: "Đã trích xuất", ANALYZING: "Đang phân tích", COMPLETED: "Hoàn tất", FAILED: "Thất bại" }
    : { PENDING: "Pending", EXTRACTING: "Extracting", EXTRACTED: "Extracted", ANALYZING: "Analyzing", COMPLETED: "Completed", FAILED: "Failed" };
  return labels[status];
}
