import { Link } from "react-router";
import { ChevronRight, Download, Trash2, Users } from "lucide-react";
import { translateCandidateStatus, type Language, type TranslationKey } from "@/app/services/i18n-service";
import { CANDIDATE_STATUS_CONFIG } from "@/app/utils/configs/status-config";
import type { UnifiedCandidateRow } from "../types";

type CandidateListProps = {
  language: Language;
  rows: UnifiedCandidateRow[];
  t: (key: TranslationKey) => string;
  onDeleteApplicationCandidate: (row: UnifiedCandidateRow) => void;
  onDeletePoolEntry: (row: UnifiedCandidateRow) => void;
  selectedKeys: Set<string>;
  allExportableSelected: boolean;
  onToggleRow: (row: UnifiedCandidateRow) => void;
  onToggleAll: () => void;
  onExportRow: (row: UnifiedCandidateRow) => void;
};

export function CandidateList({
  language,
  rows,
  t,
  onDeleteApplicationCandidate,
  onDeletePoolEntry,
  selectedKeys,
  allExportableSelected,
  onToggleRow,
  onToggleAll,
  onExportRow,
}: CandidateListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
      {rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">{t("admin.noCandidates")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          <label className="flex items-center gap-2 bg-secondary/40 px-4 py-2 text-xs font-bold text-muted-foreground">
            <input type="checkbox" checked={allExportableSelected} onChange={onToggleAll} className="size-4 accent-primary" />
            Chọn tất cả hồ sơ có CV trong kết quả lọc
          </label>
          {rows.map(row => (
            <div
              key={row.key}
              className="group flex items-center gap-2 p-3 transition-colors hover:bg-pink-50/50 sm:gap-4 sm:p-4"
            >
              <input type="checkbox" checked={selectedKeys.has(row.key)} disabled={!row.hasExportableCv} onChange={() => onToggleRow(row)} onClick={event => event.stopPropagation()} className="size-4 flex-none accent-primary disabled:opacity-35" aria-label={`Chọn ${row.name}`} />
              <Link to={row.href} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary ring-1 ring-primary/10">
                  {row.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-black text-foreground transition-colors group-hover:text-primary">{row.name}</p>
                    {row.hasNew && (
                      <span className="size-1.5 flex-none rounded-full bg-blue-500 ring-4 ring-blue-50" />
                    )}
                    <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-primary sm:inline-flex">
                      {row.kind === "pool" ? t("talentPool.keepGeneral") : `${row.applicationsCount} ${t("admin.applications")}`}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                    {row.title} · {row.email || "—"}
                  </p>
                </div>
              </Link>
              <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[row.status].badgeClass}`}>
                  {translateCandidateStatus(row.status, language)}
                </span>
                <span className="w-20 text-right text-xs font-semibold text-muted-foreground">{row.date}</span>
              </div>
              {row.candidate ? (
                <button
                  type="button"
                  onClick={() => onDeleteApplicationCandidate(row)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t("admin.deleteCandidate")}
                  aria-label={`${t("admin.deleteCandidate")}: ${row.name}`}
                >
                  <Trash2 size={14} />
                </button>
              ) : row.poolEntry ? (
                <button
                  type="button"
                  onClick={() => onDeletePoolEntry(row)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t("talentPool.delete")}
                  aria-label={`${t("talentPool.delete")}: ${row.name}`}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
              {row.hasExportableCv && (
                <button type="button" onClick={() => onExportRow(row)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary" title="Xuất CV" aria-label={`Xuất CV: ${row.name}`}>
                  <Download size={14} />
                </button>
              )}
              <ChevronRight size={14} className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
