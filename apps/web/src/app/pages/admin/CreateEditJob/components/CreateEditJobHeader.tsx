import { Link } from "react-router";
import { Archive, ChevronDown, ChevronLeft, CircleStop, ExternalLink, FileText, Globe, LoaderCircle, RotateCcw } from "lucide-react";
import type { Job } from "@/app/data";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/Common/dropdown-menu";
import { translateJobStatus, type Language, type TranslationKey } from "@/app/services/i18n-service";
import { URGENT_BADGE_CLASS } from "@/app/utils/configs/status-config";
import { statusDotClass } from "@/app/pages/admin/CreateEditJob/constants";
import type { JobForm, SavingAction } from "@/app/pages/admin/CreateEditJob/types";

type CreateEditJobHeaderProps = {
  existing?: Job;
  form: JobForm;
  isEdit: boolean;
  language: Language;
  savingAction: SavingAction | null;
  showPublishAction: boolean;
  t: (key: TranslationKey) => string;
  onSave: (action: SavingAction, status?: Job["status"]) => void;
};

export function CreateEditJobHeader({
  existing,
  form,
  isEdit,
  language,
  savingAction,
  showPublishAction,
  t,
  onSave,
}: CreateEditJobHeaderProps) {
  return (
    <header className="sticky top-16 z-20 min-w-0 rounded-2xl border border-border/80 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(120,70,86,0.06)] sm:px-5 sm:py-4 lg:top-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link to={isEdit && existing ? `/admin/jobs/${existing.id}` : "/admin/jobs"} className="mb-2 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
            <ChevronLeft size={14} /> {t("common.backToList")}
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-black leading-tight text-foreground">{isEdit ? form.title || existing?.title : t("admin.newJob")}</h1>
            {form.urgent && <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span className="text-base leading-none" aria-hidden="true">{form.logo}</span>
            <span className="truncate">{isEdit ? form.company || existing?.company : t("admin.jobFormIntro")}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEdit && existing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={savingAction !== null}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${t("admin.status")}: ${translateJobStatus(existing.status, language)}`}
                >
                  {savingAction ? <LoaderCircle size={14} className="animate-spin text-primary" /> : <span className={`size-2 rounded-full ${statusDotClass[existing.status]}`} />}
                  {translateJobStatus(existing.status, language)}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                {existing.status === "archived" ? (
                  <DropdownMenuItem onSelect={() => onSave("save", "closed")} className="cursor-pointer rounded-lg py-2 font-semibold">
                    <RotateCcw /> {t("admin.restoreJob")}
                  </DropdownMenuItem>
                ) : (
                  <>
                    {existing.status === "published" ? (
                      <DropdownMenuItem onSelect={() => onSave("save", "closed")} className="cursor-pointer rounded-lg py-2 font-semibold text-amber-700 focus:text-amber-700">
                        <CircleStop className="text-amber-600" /> {t("admin.closeJob")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => onSave("publish", "published")} className="cursor-pointer rounded-lg py-2 font-semibold text-emerald-700 focus:text-emerald-700">
                        <Globe className="text-emerald-600" /> {t("common.publish")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onSave("save", "archived")} className="cursor-pointer rounded-lg py-2 font-semibold">
                      <Archive /> {t("admin.archiveJob")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isEdit && existing?.status === "published" && (
            <Link to={`/jobs/${existing.id}`} target="_blank" rel="noreferrer" className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary">
              <ExternalLink size={14} /> {t("admin.viewPublic")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => onSave("save", isEdit ? undefined : "draft")}
            disabled={savingAction !== null}
            aria-busy={savingAction === "save"}
            className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${showPublishAction ? "border border-border bg-white px-3.5 text-foreground hover:border-primary/40 hover:bg-pink-50 disabled:hover:border-border disabled:hover:bg-white" : "bg-primary px-4 text-white shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:bg-primary"}`}
          >
            {savingAction === "save" ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
            {savingAction === "save" ? t("admin.saving") : isEdit ? t("admin.saveChanges") : t("admin.saveDraft")}
          </button>
          {showPublishAction && (
            <button
              type="button"
              onClick={() => onSave("publish", "published")}
              disabled={savingAction !== null}
              aria-busy={savingAction === "publish"}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
            >
              {savingAction === "publish" ? <LoaderCircle size={14} className="animate-spin" /> : <Globe size={14} />}
              {savingAction === "publish" ? t("admin.publishing") : t("admin.publishNow")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
