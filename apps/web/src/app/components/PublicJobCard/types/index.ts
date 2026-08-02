import type { MouseEvent, ReactNode } from "react";
import type { Job } from "@/app/data";

export type PublicJobCardProps = {
  job: Job;
  active?: boolean;
  onSelect?: (jobId: string) => void;
  showRemoveSaved?: boolean;
  onRemoveSaved?: (jobId: string) => void;
  expandedContent?: ReactNode;
};

export type JobCardActionsProps = {
  detailPath: string;
  interactive: boolean;
  posted?: string;
  showRemoveSaved: boolean;
  onDetailsClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onRemoveSaved?: () => void;
};

