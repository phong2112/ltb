import { useEffect, useRef } from "react";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";
import { notificationService } from "@/app/services/notification-service";
import { JobActions, JobDetailContent, JobPanelHeader } from "./components";
import type { JobDetailPanelProps } from "./types";

export default function JobDetailPanel({ job, variant = "panel" }: JobDetailPanelProps) {
  const { isJobSaved, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);
  const saved = isJobSaved(job.id);
  const salary = job.salary || t("jobs.salaryNegotiable");

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [job.id]);

  function toggleSaved() {
    const isNowSaved = toggleSavedJob(job.id);
    notificationService.info(t(isNowSaved ? "savedJobs.savedNotice" : "savedJobs.removedNotice"));
  }

  const actions = (
    <JobActions
      job={job}
      saved={saved}
      saveLabel={t("jobDetail.saveJob")}
      savedLabel={t("jobDetail.savedJob")}
      onToggleSaved={toggleSaved}
    />
  );
  const content = <JobDetailContent job={job} language={language} salary={salary} t={t} />;

  if (variant === "inline") {
    return (
      <div className="mt-4 border-t border-border pt-4">
        {actions}
        <div ref={contentRef} className="mt-5 space-y-7">
          {content}
        </div>
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <JobPanelHeader actions={actions} job={job} language={language} salary={salary} t={t} />
      <div ref={contentRef} className="scrollbar-stable space-y-7 p-5 lg:min-h-0 lg:flex-1 lg:overscroll-contain lg:overflow-y-auto lg:p-6">
        {content}
      </div>
    </article>
  );
}

