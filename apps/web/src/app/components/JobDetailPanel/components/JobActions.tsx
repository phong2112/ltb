import { Heart } from "lucide-react";
import type { Job } from "@/app/data";
import ApplicationDialog from "@/app/components/ApplicationDialog";

type JobActionsProps = {
  job: Job;
  saved: boolean;
  saveLabel: string;
  savedLabel: string;
  onToggleSaved: () => void;
};

export function JobActions({ job, saved, saveLabel, savedLabel, onToggleSaved }: JobActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <ApplicationDialog job={job} triggerClassName="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0" />
      <button type="button" onClick={onToggleSaved} aria-pressed={saved} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] ${saved ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}><Heart size={15} fill={saved ? "currentColor" : "none"} /> {saved ? savedLabel : saveLabel}</button>
    </div>
  );
}

