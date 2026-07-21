import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle, Copy, Mail, MessageSquare, PenLine, Plus, Trash2, Users, X, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import AdminLayout from "@/app/layouts/AdminLayout";
import { useLanguage } from "@/app/i18n";
import { apiRequest } from "@/app/services/api-client";
import { notificationService } from "@/app/services/notification";

type ApiTemplate = { id: string; name: string; channel: string; content: string };
type Template = { id: string; icon: ReactNode; title: string; channel: string; body: string };
type TemplateForm = { name: string; channel: string; content: string };

const CHANNELS = ["Zalo", "Messenger", "LinkedIn", "Email"];
const EMPTY_FORM: TemplateForm = { name: "", channel: "Zalo", content: "" };

function templatePath(templateId?: string) {
  return `/admin/templates${templateId ? `/${encodeURIComponent(templateId)}` : ""}`;
}

function fetchAdminTemplates() {
  return apiRequest<ApiTemplate[]>(templatePath());
}

function createAdminTemplate(form: TemplateForm) {
  return apiRequest<ApiTemplate>(templatePath(), {
    method: "POST",
    body: JSON.stringify(form),
  });
}

function updateAdminTemplate(id: string, form: TemplateForm) {
  return apiRequest<ApiTemplate>(templatePath(id), {
    method: "PATCH",
    body: JSON.stringify(form),
  });
}

async function deleteAdminTemplate(id: string) {
  await apiRequest<void>(templatePath(id), { method: "DELETE" });
}

export default function MessageTemplates() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Template | null>(null);
  const [channelFilter, setChannelFilter] = useState("all");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      setError("");

      try {
        const data = await fetchAdminTemplates();
        setTemplates(data.map(toTemplate));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được mẫu tin nhắn");
      }
    }

    void loadTemplates();
  }, []);

  async function copy(template: Template) {
    try {
      await navigator.clipboard.writeText(template.body.replace(/\*\*(.*?)\*\*/g, "$1"));
      setCopiedId(template.id);
      notificationService.success("Đã sao chép mẫu tin nhắn");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      notificationService.error(error, "Không thể sao chép mẫu tin nhắn");
    }
  }

  async function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const saved = editingId
        ? await updateAdminTemplate(editingId, form)
        : await createAdminTemplate(form);
      const template = toTemplate(saved);

      if (editingId) {
        setTemplates(current => current.map(item => item.id === template.id ? template : item));
        setSelected(current => current?.id === template.id ? template : current);
        notificationService.success(t("admin.templateUpdated"));
      } else {
        setTemplates(current => [...current, template]);
        setChannelFilter("all");
        setSelected(template);
        notificationService.success(t("admin.templateCreated"));
      }

      closeEditor();
    } catch (submitError) {
      notificationService.error(
        submitError,
        t(editingId ? "admin.templateUpdateError" : "admin.templateCreateError"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeEditor() {
    setIsCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreateEditor() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsCreating(true);
  }

  function openEditEditor(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.title, channel: template.channel, content: template.body });
    setIsCreating(true);
    requestAnimationFrame(() => {
      document.getElementById("template-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function confirmDeleteTemplate() {
    if (!templateToDelete) return;

    const template = templateToDelete;
    setDeletingId(template.id);

    try {
      await deleteAdminTemplate(template.id);
      setTemplates(current => current.filter(item => item.id !== template.id));
      setSelected(current => current?.id === template.id ? null : current);
      if (editingId === template.id) closeEditor();
      setTemplateToDelete(null);
      notificationService.success(t("admin.templateDeleted"));
    } catch (deleteError) {
      notificationService.error(deleteError, t("admin.templateDeleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = templates.filter((template) => channelFilter === "all" || template.channel.includes(channelFilter));

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.messageTemplatesTitle")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("admin.templatesSubtitle")}</p>
          </div>
          <button type="button" onClick={isCreating ? closeEditor : openCreateEditor} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 sm:w-auto">
            {isCreating ? <X size={16} /> : <Plus size={16} />}
            {isCreating ? t("admin.cancel") : t("admin.createTemplate")}
          </button>
        </div>

        {isCreating && (
          <form id="template-editor" onSubmit={submitTemplate} className="mb-5 scroll-mt-4 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-base font-black text-foreground">{t(editingId ? "admin.editTemplateTitle" : "admin.newTemplate")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-foreground">
                {t("admin.templateName")}
                <input required minLength={2} maxLength={100} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder={t("admin.templateNamePlaceholder")} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm font-normal outline-none transition-colors focus:border-primary" />
              </label>
              <label className="text-xs font-bold text-foreground">
                {t("admin.templateChannel")}
                <select value={form.channel} onChange={event => setForm(current => ({ ...current, channel: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-normal outline-none transition-colors focus:border-primary">
                  {CHANNELS.map(channel => <option key={channel} value={channel}>{channel}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-xs font-bold text-foreground">
              {t("admin.templateContent")}
              <textarea required maxLength={4000} rows={7} value={form.content} onChange={event => setForm(current => ({ ...current, content: event.target.value }))} placeholder={t("admin.templateContentPlaceholder")} className="mt-1.5 w-full resize-y rounded-xl border border-border px-3 py-2.5 text-sm font-normal leading-relaxed outline-none transition-colors focus:border-primary" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeEditor} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary">{t("admin.cancel")}</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? t("admin.saving") : t(editingId ? "admin.saveChanges" : "admin.saveTemplate")}</button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {["all", ...CHANNELS].map(ch => (
            <button key={ch} onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${channelFilter === ch ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {ch === "all" ? t("common.all") : ch}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((template) => (
            <div key={template.id} className="rounded-2xl border border-border bg-white p-4 transition-all hover:shadow-sm sm:p-5">
              <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-primary flex-shrink-0">{template.icon}</div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{template.title}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{template.channel}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-wrap justify-end gap-1.5">
                  <button type="button" onClick={() => openEditEditor(template)} aria-label={`${t("admin.editTemplate")}: ${template.title}`} title={t("admin.editTemplate")} className="rounded-lg border border-border p-1.5 text-muted-foreground transition-all hover:border-primary hover:text-primary">
                    <PenLine size={13} />
                  </button>
                  <button type="button" onClick={() => setTemplateToDelete(template)} aria-label={`${t("admin.deleteTemplate")}: ${template.title}`} title={t("admin.deleteTemplate")} className="rounded-lg border border-border p-1.5 text-muted-foreground transition-all hover:border-red-300 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                  <button type="button" onClick={() => setSelected(selected?.id === template.id ? null : template)} className="px-2.5 py-1 border border-border rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all font-semibold">
                    {selected?.id === template.id ? t("admin.collapse") : t("common.view")}
                  </button>
                  <button type="button" onClick={() => copy(template)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${copiedId === template.id ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-primary text-white border-primary hover:bg-primary/90"}`}>
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

      <AlertDialog open={templateToDelete !== null} onOpenChange={(open) => {
        if (!open && !deletingId) setTemplateToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteTemplateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteTemplateDescription")} {templateToDelete ? `“${templateToDelete.title}”` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteTemplate();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingId ? t("admin.deleting") : t("admin.confirmDeleteTemplate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function toTemplate(template: ApiTemplate): Template {
  return {
    id: template.id,
    icon: iconForTemplate(template),
    title: template.name,
    channel: template.channel,
    body: template.content,
  };
}
