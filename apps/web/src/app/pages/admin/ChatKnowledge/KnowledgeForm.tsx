import { useState, type FormEvent } from "react";
import { CHAT_KNOWLEDGE_CATEGORIES, CHAT_KNOWLEDGE_CONTENT_MAX_LENGTH, CHAT_KNOWLEDGE_TITLE_MAX_LENGTH, type ChatKnowledgeCategory } from "@hr-copilot/shared";
import type { ApiChatKnowledgeInput } from "@/app/apis/models/chat";
import { CHAT_KNOWLEDGE_CATEGORY_LABELS } from "./categories";

type Props = {
  initial?: ApiChatKnowledgeInput;
  saving: boolean;
  submitLabel: string;
  onSubmit: (input: ApiChatKnowledgeInput) => Promise<void>;
  onCancel?: () => void;
};

const EMPTY_INPUT: ApiChatKnowledgeInput = { category: "FAQ", title: "", content: "", isActive: true, sortOrder: 0 };
const FIELD_CLASS = "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export default function KnowledgeForm({ initial = EMPTY_INPUT, saving, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState(initial);
  const canSubmit = form.title.trim().length >= 2 && form.content.trim().length >= 2 && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ ...form, title: form.title.trim(), content: form.content.trim() });
    if (!onCancel) setForm(EMPTY_INPUT);
  }

  return (
    <form onSubmit={event => void handleSubmit(event)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="block text-xs font-bold text-foreground">
          Nhóm
          <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as ChatKnowledgeCategory })} className={`mt-1 ${FIELD_CLASS}`}>
            {CHAT_KNOWLEDGE_CATEGORIES.map(category => <option key={category} value={category}>{CHAT_KNOWLEDGE_CATEGORY_LABELS[category]}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-foreground">
          Thứ tự
          <input type="number" min={0} value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })} className={`mt-1 ${FIELD_CLASS}`} />
        </label>
      </div>
      <label className="block text-xs font-bold text-foreground">
        Câu hỏi / chủ đề
        <input required minLength={2} maxLength={CHAT_KNOWLEDGE_TITLE_MAX_LENGTH} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="VD: Quy trình phỏng vấn tại VSF như thế nào?" className={`mt-1 ${FIELD_CLASS}`} />
      </label>
      <label className="block text-xs font-bold text-foreground">
        Câu trả lời
        <textarea required minLength={2} maxLength={CHAT_KNOWLEDGE_CONTENT_MAX_LENGTH} rows={6} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className={`mt-1 resize-y ${FIELD_CLASS}`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
        Cho bot sử dụng mục này
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={!canSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-45">{saving ? "Đang lưu…" : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary">Hủy</button>}
      </div>
    </form>
  );
}
