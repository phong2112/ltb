import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft, ExternalLink, Star, CheckCircle, AlertTriangle, XCircle, MessageSquare, Calendar, Download, FileText } from "lucide-react";
import { useData, Candidate, CandidateStatus } from "@/app/data";
import { translateCandidateStatus, useLanguage, type TranslationKey } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

const STATUS_OPTS: { val: CandidateStatus; color: string }[] = [
  { val: "new", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { val: "reviewing", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { val: "interview", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { val: "offered", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { val: "rejected", color: "bg-red-100 text-red-600 border-red-200" },
];

export default function CandidateDetail() {
  const { id } = useParams();
  const { candidates, isLoading, updateCandidate } = useData();
  const { language, t } = useLanguage();
  const candidate = candidates.find(x => x.id === id);
  const [note, setNote] = useState(candidate?.hrNote || "");
  const [followUp, setFollowUp] = useState(candidate?.followUpDate || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!candidate) return;
    setNote(candidate.hrNote || "");
    setFollowUp(candidate.followUpDate || "");
  }, [candidate]);

  if (!candidate && isLoading) return (
    <AdminLayout>
      <div className="text-center py-32 text-sm font-semibold text-muted-foreground">Đang tải ứng viên...</div>
    </AdminLayout>
  );

  if (!candidate) return (
    <AdminLayout>
      <div className="text-center py-32">
        <p className="text-xl font-bold">{t("admin.candidateNotFound")}</p>
        <Link to="/admin/candidates" className="text-primary underline text-sm">{t("common.backToList")}</Link>
      </div>
    </AdminLayout>
  );

  const c = candidate;

  async function handleSave() {
    setError("");

    try {
      await updateCandidate(c.id, { hrNote: note, followUpDate: followUp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được ghi chú");
    }
  }

  const scoreColor = c.aiScore >= 90 ? "text-emerald-600" : c.aiScore >= 75 ? "text-amber-600" : c.aiScore >= 60 ? "text-orange-500" : "text-red-500";
  const scoreBg = c.aiScore >= 90 ? "bg-emerald-50 border-emerald-200" : c.aiScore >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <AdminLayout>
      <div className="max-w-[1500px]">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/candidates" className="text-muted-foreground hover:text-primary transition-colors"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{c.name}</h1>
            <p className="text-muted-foreground text-sm">{c.jobTitle} · {t("admin.appliedDate")} {c.appliedAt}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] xl:grid-cols-[minmax(0,660px)_260px_minmax(420px,1fr)] gap-5 items-start">
          {/* Left */}
          <div className="space-y-4">
            {/* AI Summary */}
            <div className={`rounded-2xl border p-5 ${scoreBg}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={16} className="text-amber-500" />
                    <h2 className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("common.aiAnalysis")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.aiSummary}</p>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className={`text-4xl font-black ${scoreColor}`} style={{ fontFamily: "'Playfair Display', serif" }}>{c.aiScore}%</div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{t("admin.matchScore")}</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><CheckCircle size={11} /> {t("admin.strengths")}</p>
                  <ul className="space-y-1">{c.strengths.map((s, i) => <li key={i} className="text-xs text-foreground">• {s}</li>)}</ul>
                  {c.strengths.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> {t("admin.risks")}</p>
                  <ul className="space-y-1">{c.risks.map((r, i) => <li key={i} className="text-xs text-foreground">• {r}</li>)}</ul>
                  {c.risks.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.noRisk")}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1"><XCircle size={11} /> {t("admin.missingRequirements")}</p>
                  <ul className="space-y-1">{c.missingReqs.map((m, i) => <li key={i} className="text-xs text-foreground">• {m}</li>)}</ul>
                  {c.missingReqs.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.meetsRequirements")}</p>}
                </div>
              </div>
            </div>

            {/* Personal info */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h2 className="font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.personalInfo")}</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[[t("admin.fullName"), c.name], [t("common.email"), c.email], [t("admin.phone"), c.phone || "—"], [t("admin.appliedRole"), c.jobTitle]].map(([label, val]) => (
                  <div key={label}><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-0.5">{label}</p><p className="text-foreground font-semibold">{val}</p></div>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1.5">CV / Portfolio</p>
                <a href={c.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
                  <ExternalLink size={13} /> {t("common.openCv")} <Download size={12} />
                </a>
              </div>
              {c.coverNote && (
                <div className="mt-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">{t("admin.coverNote")}</p>
                  <p className="text-xs text-foreground leading-relaxed">{c.coverNote}</p>
                </div>
              )}
            </div>

            {/* Screening answers */}
            {c.screeningAnswers.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-5">
                <h2 className="font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.screeningQuestions")}</h2>
                <div className="space-y-4">
                  {c.screeningAnswers.map((qa, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold text-muted-foreground mb-1">Q: {qa.q}</p>
                      <p className="text-sm text-foreground bg-pink-50 rounded-xl p-3 border border-pink-100">{qa.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-black text-foreground mb-3 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.status")}</h3>
              <div className="space-y-1.5">
                {STATUS_OPTS.map(s => (
                  <button
                    key={s.val}
                    onClick={() => void updateCandidate(c.id, { status: s.val })}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${c.status === s.val ? s.color : "border-transparent text-muted-foreground hover:bg-pink-50 hover:text-foreground"}`}
                  >
                    {c.status === s.val && "✓ "}{translateCandidateStatus(s.val, language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up date */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-black text-foreground mb-3 text-sm flex items-center gap-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                <Calendar size={14} /> {t("common.followUp")}
              </h3>
              <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors mb-3" />
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">{t("admin.hrNote")}</label>
                <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                  placeholder={t("admin.notePlaceholder")}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-colors resize-none" />
              </div>
              <button onClick={handleSave} className="w-full mt-2 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
                {saved ? `✓ ${t("admin.saved")}` : t("admin.saveNote")}
              </button>
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-black text-foreground mb-3 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.quickActions")}</h3>
              <div className="space-y-2">
                <Link to="/admin/templates" className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
                  <MessageSquare size={13} /> {t("admin.useTemplate")}
                </Link>
                <Link to={`/admin/chats?candidate=${c.id}`} className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
                  <MessageSquare size={13} /> Mở chat ứng viên
                </Link>
                <button onClick={() => navigator.clipboard.writeText(c.email)} className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
                  {t("admin.copyCandidateEmail")}
                </button>
              </div>
            </div>
          </div>

          <CvPreviewPanel candidate={c} t={t} />
        </div>
      </div>
    </AdminLayout>
  );
}

function CvPreviewPanel({ candidate, t }: { candidate: Candidate; t: (key: TranslationKey) => string }) {
  const hasCv = Boolean(candidate.cvUrl && candidate.cvUrl !== "#");
  const mimeType = candidate.cvFile?.mimeType ?? "";
  const isPdf = mimeType === "application/pdf" || /\.pdf($|[?#])/i.test(candidate.cvUrl);
  const canPreview = hasCv && (isPdf || !candidate.cvFile);

  return (
    <section className="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-20 min-h-[640px] rounded-2xl border border-border bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.cvPreview")}</h2>
          </div>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted-foreground">
            {candidate.cvFile?.originalName ?? "CV / Portfolio"}
          </p>
        </div>
        {hasCv && (
          <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90">
            <ExternalLink size={13} /> {t("common.openCv")}
          </a>
        )}
      </div>

      {candidate.cvFile && (
        <div className="grid grid-cols-2 gap-2 border-b border-border bg-pink-50/40 px-4 py-3 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("admin.fileType")}</p>
            <p className="mt-0.5 truncate font-semibold text-foreground">{mimeType || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("admin.fileSize")}</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatFileSize(candidate.cvFile.sizeBytes)}</p>
          </div>
        </div>
      )}

      <div className="h-[620px] bg-[#f8f0ea]">
        {canPreview ? (
          <iframe
            title={`${candidate.name} CV`}
            src={candidate.cvUrl}
            className="h-full w-full bg-white"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText size={26} />
            </div>
            <p className="text-sm font-black text-foreground">{t("admin.cvPreviewUnavailable")}</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("admin.cvPreviewHint")}</p>
            {hasCv && (
              <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-primary transition-colors hover:border-primary">
                <ExternalLink size={13} /> {t("common.openCv")}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function formatFileSize(sizeBytes: number) {
  if (!sizeBytes) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
