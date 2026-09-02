import { CvSummarySection as SharedCvSummarySection } from "@/app/components/CandidateDetailSections";
import type { CvSummary } from "@/app/data";

export function CvSummarySection({ summary }: { summary: CvSummary }) {
  return <SharedCvSummarySection summary={summary} title="Tóm tắt ứng viên" />;
}
