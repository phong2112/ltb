import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Globe2, Linkedin, MapPin, Plus, Radar, Search, Sparkles, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { ApiSourcingCampaign, ApiSourcingCampaignStatus, ApiSourcingDiscoveryLocationScope } from "@/app/apis/models";
import { createSourcingCampaign, listSourcingCampaigns } from "@/app/apis/requests";
import { useData } from "@/app/data";
import AdminLayout from "@/app/layouts/AdminLayout";
import { actionNotifications, runNotifiedAction } from "@/app/services/action-notifications";

type CampaignFilter = "ALL" | ApiSourcingCampaignStatus;

const FILTER_OPTIONS: Array<{ value: CampaignFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang chạy" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "CLOSED", label: "Đã đóng" },
];

export default function SourcingCampaigns() {
  const { jobs } = useData();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<ApiSourcingCampaign[]>([]);
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");
  const [discoveryLocationScope, setDiscoveryLocationScope] = useState<ApiSourcingDiscoveryLocationScope>("VIETNAM");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CampaignFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void listSourcingCampaigns()
      .then(setCampaigns)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được chiến dịch sourcing."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!jobId || submitting) return;

    setSubmitting(true);
    try {
      const campaign = await runNotifiedAction(actionNotifications.sourcing.createCampaign, () => createSourcingCampaign({ jobId, name: name.trim() || undefined, discoveryLocationScope }));
      navigate(`/admin/sourcing/${campaign.id}`);
    } finally {
      setSubmitting(false);
    }
  }
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const visibleCampaigns = campaigns.filter((campaign) => {
    const matchesFilter = filter === "ALL" || campaign.status === filter;
    const matchesSearch = !normalizedSearch || [campaign.name, campaign.job.title, campaign.job.company ?? ""]
      .some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch));
    return matchesFilter && matchesSearch;
  });
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;
  const totalProfiles = campaigns.reduce((sum, campaign) => sum + campaign._count.profiles, 0);
  const runningCampaigns = campaigns.filter((campaign) => ["QUEUED", "RUNNING"].includes(campaign.orchestration.status)).length;


  return (
    <AdminLayout>
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Radar size={14} /> Talent sourcing</div>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>Tìm đúng người cho từng vị trí</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Tạo chiến dịch từ JD, tìm ứng viên đa nguồn và đưa hồ sơ phù hợp vào một shortlist dễ review.</p>
        </div>
        <a href="#create-campaign" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-primary/90 xl:hidden"><Plus size={16} /> Tạo chiến dịch</a>
      </header>

      <section className="mb-5 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-white min-[440px]:grid-cols-3">
        <OverviewStat icon={<Radar size={17} />} value={activeCampaigns} label="Chiến dịch đang chạy" />
        <OverviewStat icon={<Users size={17} />} value={totalProfiles} label="Hồ sơ đã tìm thấy" />
        <OverviewStat icon={<Sparkles size={17} />} value={runningCampaigns} label="Workflow đang xử lý" />
      </section>

      {/* Campaign Creation And List */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Create Campaign Form */}
        <form id="create-campaign" onSubmit={handleCreate} className="order-2 scroll-mt-20 rounded-2xl border border-border bg-white p-4 sm:p-5 xl:sticky xl:top-20">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plus size={18} /></div>
            <div>
              <h2 className="font-black text-foreground">Tạo chiến dịch mới</h2>
              <p className="text-xs text-muted-foreground">Tạo brief và query trực tiếp từ JD</p>
            </div>
          </div>

          <label className="mb-1.5 block text-xs font-black text-foreground" htmlFor="sourcing-job">Vị trí cần tuyển <span className="text-primary">*</span></label>
          <select
            id="sourcing-job"
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            required
            className="mb-4 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Chọn một vị trí</option>
            {jobs.filter((job) => job.status !== "archived").map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>

          <label className="mb-1.5 block text-xs font-black text-foreground">Phạm vi tìm kiếm</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {[
              { value: "VIETNAM" as const, label: "Việt Nam", hint: "Ưu tiên đúng thị trường" },
              { value: "GLOBAL" as const, label: "Toàn cầu", hint: "Không giới hạn địa điểm" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDiscoveryLocationScope(option.value)}
                className={`min-h-[76px] rounded-xl border px-3 py-2 text-left transition-colors ${discoveryLocationScope === option.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:border-primary/50"}`}
                aria-pressed={discoveryLocationScope === option.value}
              >
                <span className="block text-sm font-black">{option.label}</span>
                <span className="mt-1 block text-[11px] font-semibold leading-4 text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-xs font-black text-foreground" htmlFor="sourcing-name">Tên chiến dịch <span className="font-semibold text-muted-foreground">(tuỳ chọn)</span></label>
          <input
            id="sourcing-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="VD: Senior Backend · HCM"
            className="mb-4 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary"
          />

          <div className="mb-4 rounded-xl bg-background p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-black text-foreground">Sau khi tạo, bạn có thể:</p>
            <p className="mt-1">Chạy workflow tự động, mở query đa nguồn hoặc thêm URL hồ sơ thủ công.</p>
          </div>

          <button disabled={!jobId || submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            <Radar size={16} /> {submitting ? "Đang chuẩn bị..." : "Tạo và mở chiến dịch"}
          </button>
        </form>

        {/* Existing Campaigns */}
        <section className="order-1 min-w-0 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
              <h2 className="font-black text-foreground">Các chiến dịch</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{visibleCampaigns.length}/{campaigns.length} chiến dịch</p>
              </div>
              <span className="hidden rounded-full bg-[#eef6ff] px-3 py-1 text-[11px] font-black text-[#0a66c2] sm:inline-flex"><Linkedin size={12} className="mr-1.5" /> LinkedIn ưu tiên</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <Search size={15} className="flex-none text-muted-foreground" />
                <span className="sr-only">Tìm chiến dịch</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm chiến dịch, vị trí hoặc công ty" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground" />
              </label>
              <div className="scrollbar-horizontal flex gap-1.5 overflow-x-auto" aria-label="Lọc trạng thái chiến dịch">
                {FILTER_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setFilter(option.value)} aria-pressed={filter === option.value} className={`h-10 flex-none rounded-xl border px-3 text-xs font-black transition-colors ${filter === option.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && <div className="p-8 text-center text-sm font-semibold text-muted-foreground">Đang tải chiến dịch...</div>}
          {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {!loading && !error && campaigns.length === 0 && (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Radar size={20} /></div>
              <p className="font-bold text-foreground">Chưa có chiến dịch sourcing</p>
              <p className="mt-1 text-sm text-muted-foreground">Chọn một job để tạo bộ tìm kiếm đa nguồn đầu tiên.</p>
            </div>
          )}
          <div className="divide-y divide-border">
          {!loading && !error && campaigns.length > 0 && visibleCampaigns.length === 0 && (
            <div className="p-10 text-center">
              <Search size={22} className="mx-auto mb-2 text-muted-foreground" />
              <p className="font-bold text-foreground">Không tìm thấy chiến dịch phù hợp</p>
              <button type="button" onClick={() => { setSearch(""); setFilter("ALL"); }} className="mt-2 text-sm font-bold text-primary hover:underline">Xóa bộ lọc</button>
            </div>
          )}
            {visibleCampaigns.map((campaign) => (
              <Link key={campaign.id} to={`/admin/sourcing/${campaign.id}`} className="group block p-4 outline-none transition-colors hover:bg-pink-50/50 focus-visible:bg-pink-50 sm:p-5">
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#0a66c2]/15 bg-[#eef6ff] text-[#0a66c2]"><Radar size={19} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-foreground transition-colors group-hover:text-primary">{campaign.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground"><BriefcaseBusiness size={12} /> {campaign.job.title}{campaign.job.company ? ` · ${campaign.job.company}` : ""}</p>
                      </div>
                      <ArrowRight size={17} className="mt-1 flex-none text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {campaign._count.profiles} hồ sơ</span>
                      <span className={`rounded-full px-2.5 py-1 ${campaignStatusMeta(campaign.status).className}`}>
                        {campaignStatusMeta(campaign.status).label}
                      </span>
                      <span className="inline-flex items-center gap-1">{campaign.discoveryLocationScope === "GLOBAL" ? <Globe2 size={12} /> : <MapPin size={12} />} {campaign.discoveryLocationScope === "GLOBAL" ? "Toàn cầu" : "Việt Nam"}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatCampaignDate(campaign.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function OverviewStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 min-[440px]:border-b-0 min-[440px]:border-r min-[440px]:last:border-r-0 sm:px-5 sm:py-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/8 text-primary">{icon}</span>
      <div>
        <p className="text-xl font-black leading-none text-foreground">{value}</p>
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function campaignStatusMeta(status: ApiSourcingCampaign["status"]) {
  if (status === "PAUSED") return { label: "Tạm dừng", className: "bg-amber-50 text-amber-700" };
  if (status === "CLOSED") return { label: "Đã đóng", className: "bg-slate-100 text-slate-600" };
  return { label: "Đang hoạt động", className: "bg-emerald-50 text-emerald-700" };
}
