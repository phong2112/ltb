import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, Linkedin, Plus, Radar, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { SourcingCampaign } from "@/app/apis/models";
import { createSourcingCampaign, listSourcingCampaigns } from "@/app/apis/requests";
import { useData } from "@/app/data";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function SourcingCampaigns() {
  const { jobs } = useData();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<SourcingCampaign[]>([]);
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");
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
      const campaign = await createSourcingCampaign({ jobId, name: name.trim() || undefined });
      navigate(`/admin/sourcing/${campaign.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0a66c2]/15 bg-[#eef6ff] px-3 py-1 text-xs font-black text-[#0a66c2]">
            <Linkedin size={13} /> Nguồn ưu tiên số 1
          </div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Sourcing Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tạo bộ tìm kiếm đa nền tảng từ JD và quản lý ứng viên đã tìm thấy.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={handleCreate} className="h-fit rounded-2xl border border-border bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plus size={18} /></div>
            <div>
              <h2 className="font-black text-foreground">Tạo chiến dịch mới</h2>
              <p className="text-xs text-muted-foreground">LinkedIn ưu tiên, mở rộng thêm nhiều nguồn</p>
            </div>
          </div>

          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-muted-foreground" htmlFor="sourcing-job">Vị trí cần tuyển</label>
          <select
            id="sourcing-job"
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            required
            className="mb-4 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="">Chọn một vị trí</option>
            {jobs.filter((job) => job.status !== "archived").map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>

          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-muted-foreground" htmlFor="sourcing-name">Tên chiến dịch (không bắt buộc)</label>
          <input
            id="sourcing-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="VD: AI Engineer · Multi-source HCM"
            className="mb-4 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary"
          />

          <div className="mb-4 rounded-xl border border-[#0a66c2]/15 bg-[#f7fbff] p-3 text-xs leading-5 text-muted-foreground">
            Hệ thống sẽ tạo query cho LinkedIn, GitHub, portfolio public, ITviec, VietnamWorks, Facebook, GitLab và Stack Overflow.
          </div>

          <button disabled={!jobId || submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            <Radar size={16} /> {submitting ? "Đang tạo..." : "Tạo bộ tìm kiếm"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
            <div>
              <h2 className="font-black text-foreground">Các chiến dịch</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{campaigns.length} chiến dịch đã tạo</p>
            </div>
            <Radar size={19} className="text-primary" />
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
            {campaigns.map((campaign) => (
              <Link key={campaign.id} to={`/admin/sourcing/${campaign.id}`} className="group block p-4 transition-colors hover:bg-pink-50/50 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#0a66c2] text-white"><Linkedin size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-foreground group-hover:text-primary">{campaign.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><BriefcaseBusiness size={12} /> {campaign.job.title}</p>
                      </div>
                      <ArrowRight size={16} className="mt-1 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground"><Users size={11} /> {campaign._count.profiles} ứng viên</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Đang chạy</span>
                      <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-[#0a66c2]">Multi-source</span>
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
