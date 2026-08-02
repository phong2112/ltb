import { CvDocumentPreview } from "./CvDocumentPreview";
import type { CvPreviewPanelProps } from "../types";

export function CvPreviewPanel({ candidate, t }: CvPreviewPanelProps) {
  return (
    <CvDocumentPreview
      name={candidate.name}
      cvUrl={candidate.cvUrl}
      cvFile={candidate.cvFile}
      t={t}
    />
  );
}

