import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { CvDocumentPreview } from "@/app/components/CandidateDetailSections";
import { useLanguage } from "@/app/services/i18n-service";
import AdminLayout from "@/app/layouts/AdminLayout";
import { API_BASE } from "@/app/apis/requests";
import { TalentPoolStatusBadge } from "@/app/components/TalentPoolStatusBadge";
import { safeAdminReturnTo } from "@/app/utils/navigation";
import { useTalentPoolDetail } from "./use-talent-pool-detail";
import { formatDate, readCvSummary } from "./utils";
import { CvSummarySection } from "./components/CvSummarySection";
import { DeleteDialog } from "./components/DeleteDialog";
import { ProfileEditForm } from "./components/ProfileEditForm";
import { PromoteJobSection } from "./components/PromoteJobSection";

export default function TalentPoolDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const returnTo = safeAdminReturnTo(searchParams.get("from"), "/admin/candidates");
  const detail = useTalentPoolDetail(id, returnTo);
  const { entry, jobs, form, promoteJobId, isLoading, isSaving, isPromoting, isVerifyingAi, isDeleting, isDirty, error } = detail;

  if (isLoading) {
    return <AdminLayout><div className="py-32 text-center text-sm font-semibold text-muted-foreground">{t("common.loading")}</div></AdminLayout>;
  }

  if (!entry) {
    return (
      <AdminLayout>
        <div className="py-32 text-center">
          <p className="text-lg font-bold text-foreground">{error || t("talentPool.notFound")}</p>
          <Link to={returnTo} className="mt-3 inline-block text-sm font-bold text-primary underline">{t("common.backToList")}</Link>
        </div>
      </AdminLayout>
    );
  }

  const displayName = entry.candidate.fullName;
  const cvUrl = entry.file ? `${API_BASE}/admin/candidates/files/${entry.file.id}` : "#";
  const cvSummary = readCvSummary(entry.structuredData?.cvSummary);

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link to={returnTo} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft size={13} /> {t("common.backToList")}
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="max-w-full truncate text-xl font-black text-foreground sm:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>{displayName}</h1>
              <TalentPoolStatusBadge status={entry.status} language={language} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{entry.file?.originalName ?? "CV"} · {formatDate(entry.createdAt, language)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void detail.handleVerifyAi()}
              disabled={isVerifyingAi || entry.status === "PENDING" || entry.status === "EXTRACTING"}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 text-xs font-bold text-primary hover:bg-primary/10 disabled:cursor-wait disabled:opacity-50"
            >
              <RefreshCw size={14} className={isVerifyingAi ? "animate-spin" : undefined} />
              {isVerifyingAi ? t("talentPool.verifyingAi") : t("talentPool.verifyAi")}
            </button>
            <button type="button" onClick={() => void detail.handleSave()} disabled={!isDirty || isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50">
              <Save size={14} /> {isSaving ? t("talentPool.saving") : t("talentPool.save")}
            </button>
            <DeleteDialog name={displayName} isDeleting={isDeleting} onConfirm={() => void detail.handleDelete()} t={t} />
          </div>
        </header>

        {entry.errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{entry.summary || entry.errorMessage}</div>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(480px,580px)]">
          <main className="space-y-5">
            {cvSummary && <CvSummarySection summary={cvSummary} />}
            <ProfileEditForm form={form} entry={entry} updateField={detail.updateField} t={t} />
            <PromoteJobSection entry={entry} jobs={jobs} promoteJobId={promoteJobId} isPromoting={isPromoting} setPromoteJobId={detail.setPromoteJobId} onPromote={() => void detail.handlePromote()} t={t} />
          </main>
          <CvDocumentPreview name={displayName} cvUrl={cvUrl} cvFile={entry.file} t={t} />
        </div>
      </div>
    </AdminLayout>
  );
}
