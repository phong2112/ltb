import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, PenLine, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { ApiChatKnowledgeEntry, ApiChatKnowledgeInput } from "@/app/apis/models/chat";
import { createChatKnowledgeEntry, deleteChatKnowledgeEntry, listChatKnowledge, updateChatKnowledgeEntry } from "@/app/apis/requests";
import AdminLayout from "@/app/layouts/AdminLayout";
import { notificationService } from "@/app/services/notification.service";
import { CHAT_KNOWLEDGE_CATEGORY_LABELS } from "./categories";
import KnowledgeForm from "./KnowledgeForm";

export default function ChatKnowledge() {
  const [entries, setEntries] = useState<ApiChatKnowledgeEntry[] | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadEntries() {
    try {
      setEntries(await listChatKnowledge());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được kho kiến thức.");
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  async function runSave(id: string, action: () => Promise<unknown>, successMessage: string) {
    setSavingId(id);
    try {
      await action();
      notificationService.success(successMessage);
      await loadEntries();
      return true;
    } catch (requestError) {
      notificationService.error(requestError, "Không thể lưu thay đổi.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate(input: ApiChatKnowledgeInput) {
    if (await runSave("new", () => createChatKnowledgeEntry(input), "Đã thêm mục kiến thức")) setIsCreating(false);
  }

  async function handleUpdate(id: string, input: ApiChatKnowledgeInput) {
    if (await runSave(id, () => updateChatKnowledgeEntry(id, input), "Đã cập nhật mục kiến thức")) setEditingId(null);
  }

  async function handleDelete(entry: ApiChatKnowledgeEntry) {
    if (!window.confirm(`Xóa “${entry.title}”? Bot sẽ không dùng mục này nữa.`)) return;
    await runSave(entry.id, () => deleteChatKnowledgeEntry(entry.id), "Đã xóa mục kiến thức");
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin/chats" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={14} /> Hộp thư ứng viên</Link>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Kho kiến thức chatbot</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Bot chỉ trả lời từ các mục đang bật ở đây và các job đang tuyển. Câu hỏi ngoài phạm vi sẽ được chuyển cho TA.</p>
          <p className="mt-1 text-xs text-muted-foreground">Câu hỏi của 6 mục đang bật đầu tiên (theo Thứ tự) hiện sẵn trong khung chat. Khi ứng viên hỏi đúng nội dung một mục, bot gửi <strong>nguyên văn</strong> câu trả lời ở đây.</p>
        </div>
        {!isCreating && <button type="button" onClick={() => setIsCreating(true)} className="inline-flex items-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white sm:self-auto"><Plus size={16} /> Thêm mục</button>}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div>}

      {isCreating && (
        <section className="mb-5 rounded-2xl border border-border bg-white p-4 sm:p-5">
          <KnowledgeForm saving={savingId === "new"} submitLabel="Thêm mục" onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
        </section>
      )}

      {entries === null && !error ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : entries?.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground"><BookOpen className="mx-auto mb-3 text-primary" size={26} /><p className="font-bold text-foreground">Chưa có mục kiến thức</p><p className="mt-1">Thêm FAQ, chính sách, phúc lợi và giới thiệu ngắn về TA để bot trả lời ứng viên.</p></div>
      ) : (
        <div className="space-y-3">
          {entries?.map(entry => (
            <article key={entry.id} className={`rounded-2xl border bg-white p-4 sm:p-5 ${entry.isActive ? "border-border" : "border-dashed border-border opacity-70"}`}>
              {editingId === entry.id ? (
                <KnowledgeForm initial={entry} saving={savingId === entry.id} submitLabel="Lưu" onSubmit={input => handleUpdate(entry.id, input)} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-primary">{CHAT_KNOWLEDGE_CATEGORY_LABELS[entry.category]}{entry.isActive ? "" : " · Đang ẩn"}</p>
                      <h2 className="mt-0.5 font-black text-foreground">{entry.title}</h2>
                    </div>
                    <div className="flex flex-none gap-1.5">
                      <button type="button" onClick={() => void runSave(entry.id, () => updateChatKnowledgeEntry(entry.id, { isActive: !entry.isActive }), entry.isActive ? "Đã ẩn mục kiến thức" : "Đã bật mục kiến thức")} disabled={savingId === entry.id} className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">{entry.isActive ? "Ẩn" : "Bật"}</button>
                      <button type="button" onClick={() => setEditingId(entry.id)} aria-label={`Sửa: ${entry.title}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary"><PenLine size={13} /></button>
                      <button type="button" onClick={() => void handleDelete(entry)} disabled={savingId === entry.id} aria-label={`Xóa: ${entry.title}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-300 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{entry.content}</p>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
