import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, RefreshCw, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import type { AnalyticsFeatureRow, AnalyticsFunnelRow, AnalyticsIssueRow, AnalyticsOverview, AnalyticsRecentEvent } from "@hr-copilot/shared";
import { ANALYTICS_FEATURES } from "@hr-copilot/shared";
import { getAnalyticsEvents, getAnalyticsFeatures, getAnalyticsIssues, getAnalyticsOverview, getApplicationFunnel, type AnalyticsFilters } from "@/app/apis/requests/analytics";
import AdminLayout from "@/app/layouts/AdminLayout";

const DAY_MS = 86_400_000;
type Resource<T> = { data: T; loading: boolean; error: boolean };

export default function AdminAnalytics() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const [overview, setOverview] = useState<Resource<AnalyticsOverview>>({ data: { from: "", to: "", sessions: 0, completedActions: 0, failedEvents: 0, errorRate: 0, activeFeatures: 0 }, loading: true, error: false });
  const [features, setFeatures] = useState<Resource<AnalyticsFeatureRow[]>>({ data: [], loading: true, error: false });
  const [issues, setIssues] = useState<Resource<AnalyticsIssueRow[]>>({ data: [], loading: true, error: false });
  const [funnel, setFunnel] = useState<Resource<AnalyticsFunnelRow[]>>({ data: [], loading: true, error: false });
  const [events, setEvents] = useState<Resource<AnalyticsRecentEvent[]>>({ data: [], loading: true, error: false });

  const load = useCallback(() => {
    loadResource(setOverview, () => getAnalyticsOverview(filters));
    loadResource(setFeatures, () => getAnalyticsFeatures(filters));
    loadResource(setIssues, () => getAnalyticsIssues(filters));
    loadResource(setFunnel, () => getApplicationFunnel(filters));
    loadResource(setEvents, () => getAnalyticsEvents(filters));
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  function setPreset(days: number) {
    const to = isoDay(new Date());
    const from = isoDay(new Date(Date.now() - (days - 1) * DAY_MS));
    setParams((current) => { const next = new URLSearchParams(current); next.set("from", from); next.set("to", to); return next; }, { replace: true });
  }

  return <AdminLayout>
    <div className="space-y-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-2xl font-black text-foreground">Phân tích sử dụng</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi mức dùng tính năng, vấn đề và funnel ứng tuyển bằng dữ liệu đã làm sạch.</p></div>
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-white p-3">
          <Filter label="Từ ngày"><input type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} className="h-9 rounded-lg border border-border px-2 text-xs" /></Filter>
          <Filter label="Đến ngày"><input type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} className="h-9 rounded-lg border border-border px-2 text-xs" /></Filter>
          <Filter label="Nhóm"><select value={filters.actorType ?? ""} onChange={(event) => update("actorType", event.target.value)} className="h-9 rounded-lg border border-border px-2 text-xs"><option value="">Tất cả</option><option value="public">Public</option><option value="admin">Admin</option></select></Filter>
          <Filter label="Tính năng"><select value={filters.feature ?? ""} onChange={(event) => update("feature", event.target.value)} className="h-9 max-w-40 rounded-lg border border-border px-2 text-xs"><option value="">Tất cả</option>{ANALYTICS_FEATURES.map((item) => <option key={item}>{item}</option>)}</select></Filter>
          <div className="flex gap-1">{[7, 30, 90, 365].map((days) => <button key={days} type="button" onClick={() => setPreset(days)} className="h-9 rounded-lg border border-border px-2 text-xs font-bold hover:border-primary hover:text-primary">{days} ngày</button>)}</div>
          <button type="button" onClick={load} className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-white"><RefreshCw size={14} /> Làm mới</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Số phiên" value={overview.data?.sessions} icon={<Users size={18} />} loading={overview.loading} error={overview.error} />
        <Kpi label="Action thành công" value={overview.data?.completedActions} icon={<Activity size={18} />} loading={overview.loading} error={overview.error} />
        <Kpi label="Tỷ lệ lỗi" value={overview.data ? `${overview.data.errorRate}%` : undefined} icon={<AlertTriangle size={18} />} loading={overview.loading} error={overview.error} />
        <Kpi label="Feature active" value={overview.data?.activeFeatures} icon={<BarChart3 size={18} />} loading={overview.loading} error={overview.error} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Tính năng được dùng nhiều" state={features} retry={load}>{features.data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-2">Feature</th><th>Hoàn tất</th><th>Phiên</th><th>Xu hướng</th></tr></thead><tbody>{features.data.map((row) => <tr key={row.feature} className="border-t"><td className="py-3 font-bold">{row.feature}</td><td>{row.completedActions}</td><td>{row.sessions}</td><td className={row.trendPercent !== null && row.trendPercent < 0 ? "text-red-600" : "text-emerald-600"}>{row.trendPercent === null ? "Mới" : `${row.trendPercent > 0 ? "+" : ""}${row.trendPercent}%`}</td></tr>)}</tbody></table></div> : <Empty />}</Panel>
        <Panel title="Funnel ứng tuyển" state={funnel} retry={load}>{funnel.data.some((row) => row.count) ? <div className="space-y-3">{funnel.data.map((row) => { const max = Math.max(...funnel.data.map((item) => item.count), 1); return <div key={row.step}><div className="mb-1 flex justify-between text-xs"><span className="font-bold">{row.step}</span><span>{row.count} · {row.conversionFromPrevious === null ? "—" : `${row.conversionFromPrevious}%`}</span></div><div className="h-3 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((row.count / max) * 100, row.count ? 3 : 0)}%` }} /></div></div>; })}</div> : <Empty />}</Panel>
      </section>

      <Panel title="Vấn đề nổi bật" state={issues} retry={load}>{issues.data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-2">Mã lỗi</th><th>Feature / action</th><th>Số lần</th><th>Phiên</th><th>Gần nhất (UTC)</th></tr></thead><tbody>{issues.data.map((row) => <tr key={`${row.errorCode}-${row.feature}-${row.action}`} className="border-t"><td className="py-3 font-mono text-xs text-red-700">{row.errorCode}</td><td>{row.feature} / {row.action}</td><td>{row.count}</td><td>{row.sessions}</td><td className="whitespace-nowrap text-xs">{new Date(row.lastOccurredAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <Empty />}</Panel>
      <Panel title="Event gần đây đã làm sạch" state={events} retry={load}>{events.data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-2">Thời gian</th><th>Nhóm</th><th>Event</th><th>Feature / action</th><th>Kết quả</th></tr></thead><tbody>{events.data.map((row) => <tr key={row.id} className="border-t"><td className="whitespace-nowrap py-3 text-xs">{new Date(row.occurredAt).toLocaleString()}</td><td>{row.actorType}</td><td className="font-mono text-xs">{row.eventName}</td><td>{row.feature ?? "—"} / {row.action ?? "—"}</td><td>{row.errorCode ?? row.outcome}</td></tr>)}</tbody></table></div> : <Empty />}</Panel>
    </div>
  </AdminLayout>;
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1 text-[11px] font-bold text-muted-foreground"><span>{label}</span>{children}</label>; }
function Kpi({ label, value, icon, loading, error }: { label: string; value: string | number | undefined; icon: React.ReactNode; loading: boolean; error: boolean }) { return <article className="rounded-2xl border border-border bg-white p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-bold">{label}</span>{icon}</div><div className="mt-3 text-2xl font-black">{loading ? "…" : error ? "—" : value ?? 0}</div></article>; }
function Panel<T>({ title, state, retry, children }: { title: string; state: Resource<T>; retry: () => void; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-white p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">{title}</h2>{state.error && <button type="button" onClick={retry} className="text-xs font-bold text-primary">Thử lại</button>}</div>{state.loading ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p> : state.error ? <p className="py-8 text-center text-sm text-red-600">Không thể tải dữ liệu.</p> : children}</section>; }
function Empty() { return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu trong khoảng thời gian này.</p>; }
function readFilters(params: URLSearchParams): AnalyticsFilters { const to = params.get("to") || isoDay(new Date()); const from = params.get("from") || isoDay(new Date(Date.now() - 29 * DAY_MS)); const actor = params.get("actorType"); return { from, to, actorType: actor === "public" || actor === "admin" ? actor : undefined, feature: params.get("feature") || undefined }; }
function isoDay(date: Date) { return date.toISOString().slice(0, 10); }
function loadResource<T>(setState: React.Dispatch<React.SetStateAction<Resource<T>>>, loader: () => Promise<T>) { setState((current) => ({ ...current, loading: true, error: false })); void loader().then((data) => setState({ data, loading: false, error: false })).catch(() => setState((current) => ({ ...current, loading: false, error: true }))); }
