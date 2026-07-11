import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Copy, CheckCircle, MessageSquare, Mail, XCircle, Users } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import { useLanguage } from "@/app/i18n";

type ApiTemplate = { id: string; name: string; channel: string; content: string };
type Template = { id: string; icon: ReactNode; title: string; channel: string; body: string };

const API_BASE = ((import.meta.env.VITE_API_BASE_PATH as string | undefined) ?? "/api").replace(/\/$/, "");

async function fetchAdminTemplates() {
  let response = await fetch(`${API_BASE}/admin/templates`, { credentials: "include" });

  if (response.status === 401) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).then((refreshResponse) => refreshResponse.ok).catch(() => false);

    if (refreshed) {
      response = await fetch(`${API_BASE}/admin/templates`, { credentials: "include" });
    }
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<ApiTemplate[]>;
}

export default function MessageTemplates() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Template | null>(null);
  const [channelFilter, setChannelFilter] = useState("Tất cả");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTemplates() {
      setError("");

      try {
        const data = await fetchAdminTemplates();
        setTemplates(data.map((template) => ({
          id: template.id,
          icon: iconForTemplate(template),
          title: template.name,
          channel: template.channel,
          body: template.content,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được mẫu tin nhắn");
      }
    }

    void loadTemplates();
  }, []);

  function copy(template: Template) {
    navigator.clipboard.writeText(template.body.replace(/\*\*(.*?)\*\*/g, "$1"));
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = templates.filter((template) => channelFilter === "Tất cả" || template.channel.includes(channelFilter));

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.messageTemplatesTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("admin.templatesSubtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {["Tất cả", "Zalo", "Email", "LinkedIn"].map(ch => (
            <button key={ch} onClick={() => setChannelFilter(ch === "Tất cả" ? "Tất cả" : ch)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${(ch === "Tất cả" && channelFilter === "Tất cả") || (ch !== "Tất cả" && channelFilter === ch) ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {ch}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((template) => (
            <div key={template.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-primary flex-shrink-0">{template.icon}</div>
                  <div>
                    <p className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{template.title}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{template.channel}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setSelected(selected?.id === template.id ? null : template)} className="px-2.5 py-1 border border-border rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all font-semibold">
                    {selected?.id === template.id ? t("admin.collapse") : t("common.view")}
                  </button>
                  <button onClick={() => copy(template)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${copiedId === template.id ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-primary text-white border-primary hover:bg-primary/90"}`}>
                    {copiedId === template.id ? <><CheckCircle size={11} /> {t("common.copied")}</> : <><Copy size={11} /> {t("common.copy")}</>}
                  </button>
                </div>
              </div>

              {selected?.id === template.id && (
                <div className="mt-3 p-3 bg-pink-50 border border-pink-100 rounded-xl">
                  <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{template.body}</pre>
                </div>
              )}

              {!selected || selected.id !== template.id ? (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{template.body.replace(/\*\*(.*?)\*\*/g, "$1").split("\n")[0]}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function iconForTemplate(template: ApiTemplate) {
  const name = template.name.toLowerCase();
  const channel = template.channel.toLowerCase();

  if (name.includes("offer")) return <CheckCircle size={16} />;
  if (name.includes("từ chối")) return <XCircle size={16} />;
  if (name.includes("talent")) return <Users size={16} />;
  if (channel.includes("email")) return <Mail size={16} />;
  return <MessageSquare size={16} />;
}
