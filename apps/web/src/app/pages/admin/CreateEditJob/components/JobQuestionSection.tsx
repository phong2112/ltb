import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Job } from "@/app/data";
import { MAX } from "@/app/pages/admin/CreateEditJob/constants";
import type { FormErrors } from "@/app/pages/admin/CreateEditJob/types";
import { FormField } from "./FormField";

type JobQuestionSectionProps = {
  questions: Job["questions"];
  error?: FormErrors["questions"];
  onAddQuestion: () => void;
  onMoveQuestion: (id: string, direction: -1 | 1) => void;
  onRemoveQuestion: (id: string) => void;
  onUpdateQuestion: (id: string, patch: Partial<Job["questions"][number]>) => void;
};

export function JobQuestionSection({
  questions,
  error,
  onAddQuestion,
  onMoveQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: JobQuestionSectionProps) {
  return (
    <FormField
      label="Câu hỏi sàng lọc"
      error={error}
      hint={`${questions.length}/${MAX.questions} câu hỏi. Bật bắt buộc cho câu hỏi cần ứng viên trả lời trước khi gửi hồ sơ.`}
      span2
    >
      <div className={`space-y-3 rounded-2xl border bg-background/60 p-3 ${error ? "border-red-300" : "border-border/80"}`}>
        {questions.length > 0 ? (
          questions.map((question, index) => (
            <div key={question.id} className="grid gap-2 rounded-xl border border-border bg-white p-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:items-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                {String(index + 1).padStart(2, "0")}
              </div>
              <textarea
                value={question.label}
                onChange={event => onUpdateQuestion(question.id, { label: event.target.value })}
                placeholder="Ví dụ: Bạn có bao nhiêu năm kinh nghiệm với React và TypeScript?"
                rows={2}
                maxLength={MAX.questionLabel}
                aria-invalid={Boolean(error)}
                className="min-h-[76px] w-full resize-y rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={event => onUpdateQuestion(question.id, { required: event.target.checked })}
                  className="size-4 accent-pink-600"
                />
                Bắt buộc
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMoveQuestion(question.id, -1)}
                  disabled={index === 0}
                  className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Đưa câu hỏi lên trên"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveQuestion(question.id, 1)}
                  disabled={index === questions.length - 1}
                  className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Đưa câu hỏi xuống dưới"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveQuestion(question.id)}
                  className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  aria-label="Xóa câu hỏi"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-5 text-center text-sm font-semibold text-muted-foreground">
            Chưa có câu hỏi sàng lọc cho job này.
          </div>
        )}
        <button
          type="button"
          onClick={onAddQuestion}
          disabled={questions.length >= MAX.questions}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-bold text-primary transition-colors hover:border-primary/40 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} /> Thêm câu hỏi
        </button>
      </div>
    </FormField>
  );
}
