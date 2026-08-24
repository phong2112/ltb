import { useEffect, useState, type FormEvent } from "react";
import { Archive, ArrowLeft, BriefcaseBusiness, Check, Copy, ExternalLink, Github, Globe2, Linkedin, LinkIcon, LoaderCircle, MapPin, Search, Sparkles, Users, Workflow } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import type { ApiSourcedProfile, ApiSourcingCampaign, ApiSourcingCampaignStatus, ApiSourcingProfileFeedback, ApiSourcingProfileStatus, ApiSourcingSource } from "@/app/apis/models";
import { discoverLinkedinProfiles, getSourcingCampaign, importSourcingProfiles, runSourcingOrchestration, suggestInternalCandidates, updateSourcingCampaignStatus, updateSourcingProfileFeedback, updateSourcingProfileStatus } from "@/app/apis/requests";
import AdminLayout from "@/app/layouts/AdminLayout";

const STATUS_OPTIONS: Array<{ value: ApiSourcingProfileStatus; label: string }> = [
  { value: "SOURCED", label: "Mới tìm thấy" },
  { value: "QUALIFIED", label: "Phù hợp" },
  { value: "CONTACT_READY", label: "Sẵn sàng liên hệ" },
  { value: "CONTACTED", label: "Đã liên hệ" },
  { value: "REPLIED", label: "Đã phản hồi" },
  { value: "INTERESTED", label: "Quan tâm" },
  { value: "SCREENING", label: "Sàng lọc" },
  { value: "INTERVIEW", label: "Phỏng vấn" },
  { value: "OFFER", label: "Offer" },
  { value: "HIRED", label: "Đã tuyển" },
  { value: "NOT_A_FIT", label: "Không phù hợp" },
  { value: "REJECTED", label: "Từ chối" },
];

const FEEDBACK_OPTIONS: Array<{ value: ApiSourcingProfileFeedback; label: string }> = [
  { value: "RELEVANT", label: "Khớp JD" },
  { value: "MAYBE", label: "Cần xem thêm" },
  { value: "NOT_RELEVANT", label: "Không khớp JD" },
];

const IMPORT_SOURCES: Array<{ value: ApiSourcingSource; label: string; hint: string; color: string; placeholder: string; icon: React.ReactNode }> = [
  {
    value: "LINKEDIN",
    label: "LinkedIn",
    hint: "Top priority",
    color: "#0a66c2",
    placeholder: "https://linkedin.com/in/ung-vien-1\nhttps://linkedin.com/in/ung-vien-2",
    icon: <Linkedin size={16} />,
  },
  {
    value: "GITHUB",
    label: "GitHub",
    hint: "Repo signal",
    color: "#24292f",
    placeholder: "https://github.com/username",
    icon: <Github size={16} />,
  },
  {
    value: "PUBLIC_WEB",
    label: "Public web",
    hint: "Portfolio",
    color: "#475569",
    placeholder: "https://portfolio.dev/ung-vien\nhttps://blog.dev/profile",
    icon: <Globe2 size={16} />,
  },
  {
    value: "ITVIEC",
    label: "ITviec",
    hint: "Job board",
    color: "#dc2626",
    placeholder: "https://itviec.com/...",
    icon: <BriefcaseBusiness size={16} />,
  },
  {
    value: "VIETNAMWORKS",
    label: "VietnamWorks",
    hint: "Job board",
    color: "#2563eb",
    placeholder: "https://vietnamworks.com/...",
    icon: <BriefcaseBusiness size={16} />,
  },
  {
    value: "FACEBOOK",
    label: "Facebook",
    hint: "Public profile",
    color: "#1877f2",
    placeholder: "https://facebook.com/profile",
    icon: <Globe2 size={16} />,
  },
  {
    value: "GITLAB",
    label: "GitLab",
    hint: "Repo signal",
    color: "#f97316",
    placeholder: "https://gitlab.com/username",
    icon: <Globe2 size={16} />,
  },
  {
    value: "STACK_OVERFLOW",
    label: "Stack Overflow",
    hint: "Public users",
    color: "#f48024",
    placeholder: "https://stackoverflow.com/users/123/name",
    icon: <Globe2 size={16} />,
  },
  {
    value: "MANUAL",
    label: "Manual",
    hint: "Nguồn khác",
    color: "#7c3aed",
    placeholder: "https://nguon-khac.com/profile",
    icon: <LinkIcon size={16} />,
  },
];

export default function SourcingCampaignDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<ApiSourcingCampaign | null>(null);
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [suggestingInternal, setSuggestingInternal] = useState(false);
  const [updatingCampaignStatus, setUpdatingCampaignStatus] = useState(false);
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState("");
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [discoverySummary, setDiscoverySummary] = useState("");
  const [discoveryStatus, setDiscoveryStatus] = useState<"COMPLETED" | "DEGRADED" | "UNAVAILABLE">("COMPLETED");
  const [internalSummary, setInternalSummary] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [activeSource, setActiveSource] = useState<ApiSourcingSource>(() => readSourcingSource(searchParams));

  useEffect(() => {
    if (!id) return;
    void getSourcingCampaign(id)
      .then(setCampaign)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được chiến dịch."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setActiveSource(readSourcingSource(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const status = campaign?.orchestration?.status;
    if (!campaign || (status !== "QUEUED" && status !== "RUNNING")) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getSourcingCampaign(campaign.id)
        .then(nextCampaign => {
          if (!cancelled) setCampaign(nextCampaign);
        })
        .catch(() => undefined);
    }, 2_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [campaign]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeSource === "LINKEDIN") {
      next.delete("source");
    } else {
      next.set("source", activeSource);
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [activeSource, searchParams, setSearchParams]);

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    const profileUrls = urls.split(/\s+/u).map((value) => value.trim()).filter(Boolean);
    if (!campaign || !profileUrls.length || importing) return;

    setImporting(true);
    try {
      const result = await importSourcingProfiles(campaign.id, activeSource, profileUrls);
      setCampaign({ ...campaign, profiles: result.profiles, _count: { profiles: result.profiles.length } });
      setUrls("");
      const parts = [`Đã thêm ${result.createdCount} hồ sơ`];
      if (result.duplicateCount) parts.push(`${result.duplicateCount} hồ sơ trùng`);
      if (result.foundInOtherCampaignCount) parts.push(`${result.foundInOtherCampaignCount} đã có ở campaign khác`);
      if (result.invalidUrls.length) parts.push(`${result.invalidUrls.length} URL không hợp lệ`);
      setImportSummary(parts.join(" · "));
    } finally {
      setImporting(false);
    }
  }

  async function handleLinkedinDiscovery() {
    if (!campaign || discovering) return;

    setDiscovering(true);
    setDiscoverySummary("");
    try {
      const result = await discoverLinkedinProfiles(campaign.id);
      setDiscoveryStatus(result.providerStatus);
      setCampaign({ ...campaign, profiles: result.profiles, _count: { profiles: result.profiles.length } });
      const parts = [
        `Đã chạy ${result.successfulQueryCount}/${result.queryCount} query`,
        `tìm thấy ${result.resultCount} hồ sơ`,
        `thêm mới ${result.createdCount}`,
      ];
      if (result.duplicateCount) parts.push(`${result.duplicateCount} hồ sơ trùng`);
      if (result.skippedQueries.length) parts.push(`${result.skippedQueries.length} query lỗi`);
      setDiscoverySummary(parts.join(" · "));
    } finally {
      setDiscovering(false);
    }
  }

  async function handleOrchestration() {
    if (!campaign || isOrchestrationActive(campaign)) return;

    const result = await runSourcingOrchestration(campaign.id);
    setCampaign(result.campaign);
  }

  async function handleInternalSuggestions() {
    if (!campaign || suggestingInternal) return;

    setSuggestingInternal(true);
    setInternalSummary("");
    try {
      const result = await suggestInternalCandidates(campaign.id);
      setCampaign({ ...campaign, profiles: result.profiles, _count: { profiles: result.profiles.length } });
      const parts = [`gợi ý ${result.resultCount} hồ sơ`, `thêm mới ${result.createdCount}`];
      if (result.duplicateCount) parts.push(`${result.duplicateCount} hồ sơ trùng`);
      setInternalSummary(parts.join(" · "));
    } finally {
      setSuggestingInternal(false);
    }
  }

  async function handleCampaignStatus(status: ApiSourcingCampaignStatus) {
    if (!campaign || updatingCampaignStatus || status === campaign.status) return;
    setUpdatingCampaignStatus(true);
    try {
      setCampaign(await updateSourcingCampaignStatus(campaign.id, status));
    } finally {
      setUpdatingCampaignStatus(false);
    }
  }

  async function copyQuery(queryId: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedId(queryId);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  async function updateStatus(profile: ApiSourcedProfile, status: ApiSourcingProfileStatus) {
    if (!campaign) return;
    const updated = await updateSourcingProfileStatus(campaign.id, profile.id, status);
    setCampaign({
      ...campaign,
      profiles: (campaign.profiles ?? []).map((item) => item.id === updated.id ? updated : item),
    });
  }

  async function updateFeedback(profile: ApiSourcedProfile, feedback: ApiSourcingProfileFeedback | null) {
    if (!campaign || updatingFeedbackId) return;
    setUpdatingFeedbackId(profile.id);
    try {
      const updated = await updateSourcingProfileFeedback(campaign.id, profile.id, feedback);
      setCampaign({
        ...campaign,
        profiles: (campaign.profiles ?? []).map((item) => item.id === updated.id ? updated : item),
      });
    } finally {
      setUpdatingFeedbackId("");
    }
  }

  if (loading) return <AdminLayout><div className="p-10 text-sm font-semibold text-muted-foreground">Đang tải chiến dịch...</div></AdminLayout>;
  if (error || !campaign) return <AdminLayout><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error || "Không tìm thấy chiến dịch."}</div></AdminLayout>;

  const queries = Array.isArray(campaign.searchQueries) ? campaign.searchQueries : [];
  const activeSourceMeta = sourceMeta(activeSource);
  const activeQueries = queries.filter((query) => query.source === activeSource);
  const profiles = campaign.profiles ?? [];
  const orchestration = campaign.orchestration;
  const orchestrating = isOrchestrationActive(campaign);
  const orchestrationResult = orchestration.result ?? null;
  const campaignActive = campaign.status === "ACTIVE";

  return (
    <AdminLayout>
      {/* Back Link */}
      <Link to="/admin/sourcing" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={13} /> Tất cả chiến dịch</Link>

      {/* Campaign Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#0a66c2] px-3 py-1 text-xs font-black text-white"><Linkedin size={13} /> LINKEDIN · TOP PRIORITY</div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.job.title}{campaign.job.company ? ` · ${campaign.job.company}` : ""}</p>
        </div>
        <div className="flex w-fit items-center gap-2">
          <select
            value={campaign.status}
            onChange={(event) => void handleCampaignStatus(event.target.value as ApiSourcingCampaignStatus)}
            disabled={updatingCampaignStatus || orchestrating}
            aria-label="Trạng thái chiến dịch"
            className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-black text-foreground outline-none focus:border-primary disabled:opacity-60"
          >
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-black text-foreground"><Users size={15} className="text-primary" /> {profiles.length} ứng viên</div>
        </div>
      </div>

      {/* Campaign Workspace */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        {/* Search Queries And Results */}
        <div className="space-y-5">
          {/* Query Builder And Discovery Actions */}
          <section className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="border-b border-border p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white" style={{ backgroundColor: activeSourceMeta.color }}><Search size={18} /></div>
                <div>
                  <h2 className="font-black text-foreground">Bộ tìm kiếm đa nền tảng</h2>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">LinkedIn luôn đứng đầu. Có thể chạy discovery tự động từ public search hoặc mở query để kiểm tra thủ công.</p>
                </div>
              </div>
              {!campaignActive && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  Automatic discovery đang tắt vì campaign {campaign.status === "PAUSED" ? "được tạm dừng" : "đã đóng"}. Chuyển về “Đang hoạt động” để chạy lại.
                </div>
              )}
              <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">Sourcing orchestration</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">AI mở rộng query từ JD khi khả dụng, đồng thời rà Talent Pool và chạy Brave có retry/fallback. Mọi quyết định vẫn do TA review.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleOrchestration()}
                    disabled={!campaignActive || orchestrating || discovering || suggestingInternal}
                    className="inline-flex h-10 flex-none items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {orchestrating ? <LoaderCircle size={14} className="animate-spin" /> : <Workflow size={14} />} {orchestrating ? "Đang điều phối..." : "Chạy toàn bộ workflow"}
                  </button>
                </div>
                {orchestrating && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    <p className="font-black">{orchestration.status === "QUEUED" ? "Workflow đang chờ chạy" : "Workflow đang chạy"}</p>
                    <p className="mt-1 font-semibold">Trang sẽ tự cập nhật khi workflow hoàn tất.</p>
                  </div>
                )}
                {orchestration.status === "FAILED" && orchestration.error && (
                  <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                    <p className="font-black">Workflow chưa hoàn tất</p>
                    <p className="mt-1 font-semibold">{orchestration.error}</p>
                  </div>
                )}
                {orchestrationResult && !orchestrating && (
                  <div className={`mt-3 rounded-lg border bg-white px-3 py-2 text-xs ${orchestrationResult.status === "DEGRADED" ? "border-amber-300 text-amber-900" : "border-emerald-300 text-emerald-800"}`}>
                    <p className="font-black">{orchestrationResult.status === "DEGRADED" ? "Hoàn tất một phần" : "Hoàn tất"} · thêm {orchestrationResult.createdCount} hồ sơ · {orchestrationResult.aiAssisted ? "có AI planner" : "deterministic fallback"}</p>
                    <ul className="mt-1.5 space-y-1 font-semibold">
                      {orchestrationResult.stages.map((stage) => <li key={stage.stage}>• {stage.message}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">Suggest từ hệ thống</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Tự rà Talent Pool và ứng viên từng apply vị trí khác, rồi gợi ý hồ sơ có tín hiệu khớp JD.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleInternalSuggestions()}
                    disabled={!campaignActive || suggestingInternal || orchestrating}
                    className="inline-flex h-10 flex-none items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestingInternal ? <LoaderCircle size={14} className="animate-spin" /> : <Archive size={14} />} {suggestingInternal ? "Đang rà..." : "Suggest ứng viên"}
                  </button>
                </div>
                {internalSummary && <p className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800">{internalSummary}</p>}
              </div>
              {activeSource === "LINKEDIN" && (
                <div className="mb-4 rounded-xl border border-[#0a66c2]/20 bg-[#0a66c2]/5 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">LinkedIn assisted discovery</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Tự chạy X-Ray query qua Brave Search, dedupe URL và chấm potential fit từ snippet công khai.</p>
                    <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#0a66c2] ring-1 ring-[#0a66c2]/20">
                      {campaign.discoveryLocationScope === "GLOBAL" ? "All location" : "Việt Nam"}
                    </span>
                  </div>
                    <button
                      type="button"
                      onClick={() => void handleLinkedinDiscovery()}
                      disabled={!campaignActive || discovering || orchestrating}
                      className="inline-flex h-10 flex-none items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-4 text-xs font-black text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {discovering ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {discovering ? "Đang tìm..." : "Tìm LinkedIn tự động"}
                    </button>
                  </div>
                  {discoverySummary && <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${discoveryStatus === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{discoverySummary}</p>}
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {IMPORT_SOURCES.filter((source) => source.value !== "MANUAL").map((source) => (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => setActiveSource(source.value)}
                    className={`flex h-10 flex-none items-center gap-2 rounded-xl border px-3 text-xs font-black ${activeSource === source.value ? "border-transparent text-white" : "border-border bg-white text-muted-foreground hover:text-foreground"}`}
                    style={activeSource === source.value ? { backgroundColor: source.color } : undefined}
                  >
                    {source.icon} {source.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Query List */}
            <div className="divide-y divide-border">
              {activeQueries.length ? activeQueries.map((query) => (
                <div key={query.id} className="p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: sourceMeta(query.source).color }}>{query.priority}</span>
                      <h3 className="text-sm font-black text-foreground">{query.label}</h3>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{query.type}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground">{query.query}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={query.searchUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black text-white hover:opacity-90" style={{ backgroundColor: sourceMeta(query.source).color }}>
                      {sourceMeta(query.source).icon} Mở kết quả <ExternalLink size={12} />
                    </a>
                    <button type="button" onClick={() => void copyQuery(query.id, query.query)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">
                      {copiedId === query.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === query.id ? "Đã sao chép" : "Sao chép query"}
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-5 text-sm font-semibold text-muted-foreground">Nguồn này chưa có query tự động. Bạn vẫn có thể import URL thủ công ở khung bên phải.</div>
              )}
            </div>
          </section>

          {/* Campaign Candidate Pipeline */}
          <section className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
              <div>
                <h2 className="font-black text-foreground">Ứng viên trong campaign</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Theo dõi từ lúc tìm thấy đến khi tuyển.</p>
              </div>
              <Users size={18} className="text-primary" />
            </div>
            {profiles.length === 0 ? (
              <div className="p-8 text-center text-sm font-semibold text-muted-foreground">Chưa có ứng viên. Hãy mở nguồn tìm kiếm và thêm URL hồ sơ phù hợp.</div>
            ) : (
              <div className="divide-y divide-border">
                {profiles.map((profile) => (
                  <div key={profile.id} className="p-4 sm:p-5">
                    <div className="sm:flex sm:items-center sm:gap-3">
                    <div className="mb-3 flex min-w-0 flex-1 items-center gap-3 sm:mb-0">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-white" style={{ backgroundColor: sourceMeta(profile.source).color }}>{sourceMeta(profile.source).icon}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{profile.displayName || profileNameFromUrl(profile.profileUrl)}</p>
                        {profile.headline && <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted-foreground">{profile.headline}</p>}
                        <div className="mt-0.5 flex min-w-0 items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: sourceMeta(profile.source).color }}>{sourceMeta(profile.source).label}</span>
                          <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 truncate text-xs text-[#0a66c2] hover:underline"><LinkIcon size={11} /> {profile.profileUrl}</a>
                        </div>
                      </div>
                    </div>
                    <div className="grid w-full gap-2 sm:w-44">
                      <select
                        value={profile.status}
                        onChange={(event) => void updateStatus(profile, event.target.value as ApiSourcingProfileStatus)}
                        aria-label="Trạng thái funnel"
                        className="h-9 w-full rounded-xl border border-border bg-white px-3 text-xs font-bold text-foreground outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select
                        value={profile.feedback ?? ""}
                        onChange={(event) => void updateFeedback(profile, event.target.value ? event.target.value as ApiSourcingProfileFeedback : null)}
                        disabled={updatingFeedbackId === profile.id}
                        aria-label="Đánh giá độ khớp JD"
                        className="h-9 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-900 outline-none focus:border-violet-500 disabled:opacity-60"
                      >
                        <option value="">Đánh giá độ khớp</option>
                        {FEEDBACK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    </div>
                    <DiscoveryEvidence profile={profile} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Import And Brief Sidebar */}
        <aside className="space-y-5">
          {/* Manual Profile Import */}
          <form onSubmit={handleImport} className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: activeSourceMeta.color }}>{activeSourceMeta.icon}</div>
              <div>
                <h2 className="font-black text-foreground">Thêm hồ sơ {activeSourceMeta.label}</h2>
                <p className="text-xs text-muted-foreground">Có thể dán nhiều URL cùng lúc</p>
              </div>
            </div>
            <select
              value={activeSource}
              onChange={(event) => setActiveSource(event.target.value as ApiSourcingSource)}
              className="mb-3 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-bold text-foreground outline-none focus:border-primary"
            >
              {IMPORT_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label} · {source.hint}</option>)}
            </select>
            <textarea
              value={urls}
              onChange={(event) => setUrls(event.target.value)}
              rows={7}
              placeholder={activeSourceMeta.placeholder}
              className="w-full resize-y rounded-xl border border-border p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/60 focus:border-[#0a66c2]"
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Mỗi URL một dòng. Hệ thống tự bỏ tracking và không thêm lại hồ sơ đã có.</p>
            {importSummary && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">{importSummary}</div>}
            <button disabled={!urls.trim() || importing} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
              {activeSourceMeta.icon} {importing ? "Đang thêm..." : "Thêm vào campaign"}
            </button>
          </form>

          {/* Sourcing Brief */}
          <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <h2 className="mb-3 font-black text-foreground">Sourcing brief</h2>
            <BriefItem label="Chức danh" values={campaign.brief.titleVariants ?? [campaign.job.title]} />
            <BriefItem label="Kỹ năng" values={campaign.brief.skills ?? []} />
            <BriefItem label="Địa điểm" values={campaign.brief.locations ?? []} icon={<MapPin size={12} />} />
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              AI chỉ mở rộng query khi có cấu hình; retrieval, dedupe và potential score luôn có fallback deterministic. TA vẫn là người xem hồ sơ và quyết định liên hệ.
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

function DiscoveryEvidence({ profile }: { profile: ApiSourcedProfile }) {
  const evidence = parseDiscoveryNotes(profile.notes);
  if (!evidence) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-background/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">Potential {evidence.potentialScore}/100</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{evidence.confidence}</span>
        <span className="text-[10px] font-semibold text-muted-foreground">{evidence.metaLabel}</span>
      </div>
      {evidence.matchedSignals.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {evidence.matchedSignals.slice(0, 5).map((signal) => <span key={signal} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-foreground ring-1 ring-border">{signal}</span>)}
        </div>
      )}
      <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{evidence.evidence || evidence.reason}</p>
    </div>
  );
}

type DiscoveryNotes = {
  type: "linkedin_discovery" | "internal_candidate_suggestion";
  potentialScore: number;
  confidence: string;
  matchedSignals: string[];
  evidence: string;
  reason: string;
  searchRank?: number;
  sourceKind?: string;
  metaLabel: string;
};

function parseDiscoveryNotes(value?: string | null): DiscoveryNotes | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<DiscoveryNotes>;
    const type = parsed.type;
    if ((type !== "linkedin_discovery" && type !== "internal_candidate_suggestion") || typeof parsed.potentialScore !== "number") return null;
    const sourceKind = typeof parsed.sourceKind === "string" ? parsed.sourceKind : undefined;
    return {
      type,
      potentialScore: parsed.potentialScore,
      confidence: typeof parsed.confidence === "string" ? parsed.confidence : "LOW",
      matchedSignals: Array.isArray(parsed.matchedSignals) ? parsed.matchedSignals.filter((item): item is string => typeof item === "string") : [],
      evidence: typeof parsed.evidence === "string" ? parsed.evidence : "",
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      searchRank: typeof parsed.searchRank === "number" ? parsed.searchRank : undefined,
      sourceKind,
      metaLabel: type === "internal_candidate_suggestion"
        ? sourceKindLabel(sourceKind)
        : `Query #${typeof parsed.searchRank === "number" ? parsed.searchRank : 0}`,
    };
  } catch {
    return null;
  }
}

function sourceKindLabel(value?: string) {
  if (value === "talent_pool") return "Talent Pool";
  if (value === "previous_application") return "Ứng viên cũ";
  return "Hệ thống";
}

function BriefItem({ label, values, icon }: { label: string; values: string[]; icon?: React.ReactNode }) {
  if (!values.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <div className="flex flex-wrap gap-1.5">{values.map((value) => <span key={value} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">{value}</span>)}</div>
    </div>
  );
}

function profileNameFromUrl(value: string) {
  const slug = value.split("/").filter(Boolean).at(-1) ?? "Hồ sơ LinkedIn";
  return slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function sourceMeta(source: ApiSourcingSource) {
  if (source === "TALENT_POOL") {
    return {
      value: "TALENT_POOL" as ApiSourcingSource,
      label: "Hệ thống",
      hint: "Talent Pool",
      color: "#059669",
      placeholder: "",
      icon: <Archive size={16} />,
    };
  }
  return IMPORT_SOURCES.find((item) => item.value === source) ?? IMPORT_SOURCES[0];
}

function readSourcingSource(searchParams: URLSearchParams): ApiSourcingSource {
  const value = searchParams.get("source");
  return value && IMPORT_SOURCES.some((item) => item.value === value) ? value as ApiSourcingSource : "LINKEDIN";
}

function isOrchestrationActive(campaign: ApiSourcingCampaign) {
  return campaign.orchestration.status === "QUEUED" || campaign.orchestration.status === "RUNNING";
}
