import { Link } from "react-router";
import { Bell, Calendar, Copy, ChevronRight, CheckCircle } from "lucide-react";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/services/i18n-service";
import AdminLayout from "@/app/layouts/AdminLayout";
import { useState } from "react";
import { CANDIDATE_STATUS_CONFIG } from "@/app/utils/configs/status-config";
export default function FollowUp() {
  const { candidates } = useData();
  const { language, t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const needFollowUp = candidates.filter(c => c.status !== "rejected" && c.status !== "offer" && c.status !== "offer_closed");
  const overdue = needFollowUp.filter(c => c.followUpDate && c.followUpDate < new Date().toISOString().split("T")[0]);
  const upcoming = needFollowUp.filter(c => c.followUpDate && c.followUpDate >= new Date().toISOString().split("T")[0]);
  const noDate = needFollowUp.filter(c => !c.followUpDate);

  function copyEmail(c: typeof candidates[0]) {
    const msg = `Chào ${c.name},\n\nCảm ơn bạn đã ứng tuyển vị trí ${c.jobTitle}. Tôi muốn cập nhật tình trạng hồ sơ của bạn...\n\nTrân trọng,\nLường Bích`;
    navigator.clipboard.writeText(msg);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const Section = ({ title, items, accent }: { title: string; items: typeof candidates; accent?: string }) => (
    items.length > 0 ? (
      <div className="mb-6">
        <h2 className={`text-sm font-black mb-3 ${accent || "text-foreground"}`} style={{ fontFamily: "'Playfair Display', serif" }}>{title} <span className="font-normal text-muted-foreground text-xs ml-1">({items.length})</span></h2>
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {items.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-pink-50/50 sm:gap-4 sm:p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{c.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <Link to={`/admin/candidates/${c.candidateId}?application=${c.applicationId}`} className="font-bold text-foreground text-sm hover:text-primary transition-colors">{c.name}</Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>{c.jobTitle}</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[c.status].badgeClass}`}>{translateCandidateStatus(c.status, language)}</span>
                  {c.followUpDate && <span className="flex items-center gap-0.5"><Calendar size={10} />{c.followUpDate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => copyEmail(c)} title={t("common.copyMessage")}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all sm:w-auto sm:gap-1.5 sm:px-3 ${copiedId === c.id ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                  {copiedId === c.id ? (
                    <>
                      <CheckCircle size={13} />
                      <span className="hidden sm:inline">{t("common.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span className="hidden sm:inline">{t("common.copyMessage")}</span>
                    </>
                  )}
                </button>
                <Link to={`/admin/candidates/${c.candidateId}?application=${c.applicationId}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary sm:h-7 sm:w-7">
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><Bell size={20} /></div>
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.followUpReminders")}</h1>
            <p className="text-muted-foreground text-sm">{needFollowUp.length} {t("admin.followUpTask")}</p>
          </div>
        </div>

        {needFollowUp.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
            <p className="font-bold">{t("admin.noPendingFollowUps")}</p>
          </div>
        )}

        <Section title={`⚠️ ${t("admin.overdueFollowUps")}`} items={overdue} accent="text-red-600" />
        <Section title={`📅 ${t("admin.upcomingFollowUps")}`} items={upcoming} accent="text-amber-700" />
        <Section title={`⏳ ${t("admin.noFollowUpDate")}`} items={noDate} />
      </div>
    </AdminLayout>
  );
}
