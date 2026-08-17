import { BriefcaseBusiness, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import type { ApiTalentPoolEntry } from "@/app/apis/models";
import type { ApiJob } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";

type Props = {
  entry: ApiTalentPoolEntry;
  jobs: ApiJob[];
  promoteJobId: string;
  isPromoting: boolean;
  setPromoteJobId: (id: string) => void;
  onPromote: () => void;
  t: ReturnType<typeof useLanguage>["t"];
};

export function PromoteJobSection({ entry, jobs, promoteJobId, isPromoting, setPromoteJobId, onPromote, t }: Props) {
  const promotedJob = jobs.find(job => job.id === promoteJobId);

  return (
    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <BriefcaseBusiness size={16} className="text-primary" />
        <h2 className="text-base font-black text-foreground">{t("talentPool.assignJob")}</h2>
      </div>
      {entry.promotedApplicationId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-emerald-800">{t("talentPool.alreadyAssigned")}</p>
          <Link
            to={`/admin/candidates/${entry.candidate.id}?application=${entry.promotedApplicationId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 underline"
          >
            {t("talentPool.openApplication")} <ExternalLink size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={promoteJobId}
            onChange={event => setPromoteJobId(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-border bg-input-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">{t("talentPool.chooseJob")}</option>
            {jobs.filter(job => job.status !== "ARCHIVED").map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!promoteJobId || isPromoting}
            onClick={onPromote}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            <BriefcaseBusiness size={14} /> {isPromoting ? t("talentPool.promoting") : t("talentPool.assign")}
          </button>
          {promotedJob && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t("talentPool.assignHint")} <strong>{promotedJob.title}</strong>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
