import { maxScreeningAnswerLength } from "@hr-copilot/shared";
import { fieldControlClassName } from "@/app/components/ApplicationForm/constants";
import type { FormErrors, ScreeningQuestion, Translate } from "@/app/components/ApplicationForm/types";
import { getMeaningfulAnswerLength } from "@/app/components/ApplicationForm/utils";

type ScreeningQuestionsProps = {
  errors: FormErrors;
  fieldId: (name: string) => string;
  questions: ScreeningQuestion[];
  questionAnswers: Record<string, string>;
  setQuestionAnswerError: (question: ScreeningQuestion, value: string) => void;
  t: Translate;
  updateQuestionAnswer: (question: ScreeningQuestion, value: string) => void;
};

export function ScreeningQuestions({
  errors,
  fieldId,
  questions,
  questionAnswers,
  setQuestionAnswerError,
  t,
  updateQuestionAnswer,
}: ScreeningQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/80 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-foreground">{t("admin.screeningQuestions")}</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
          {questions.length}
        </span>
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => {
          const error = errors[`question-${question.id}`];
          const answerId = fieldId(`question-${question.id}`);
          const answer = questionAnswers[question.id] ?? "";
          const answerLength = getMeaningfulAnswerLength(answer);
          const hintId = `${answerId}-hint`;
          const countId = `${answerId}-count`;
          const describedBy = [error ? `${answerId}-error` : hintId, countId]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={question.id} className="rounded-xl border border-border bg-background/60 p-3">
              <label htmlFor={answerId} className="block text-xs font-bold leading-5 text-foreground">
                <span className="mr-1 text-primary">{String(index + 1).padStart(2, "0")}.</span>
                {question.label}
                {question.required && <span className="ml-0.5 text-primary">*</span>}
              </label>
              <textarea
                id={answerId}
                rows={3}
                value={answer}
                onChange={(event) => updateQuestionAnswer(question, event.target.value)}
                onBlur={(event) => setQuestionAnswerError(question, event.target.value)}
                maxLength={maxScreeningAnswerLength}
                required={question.required}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                className={`${fieldControlClassName} mt-2 min-h-[94px] resize-y leading-5 ${error ? "border-red-300 focus:border-red-500" : "border-border"}`}
              />
              <div className="mt-1.5 flex min-h-4 justify-between gap-3 text-[11px] leading-4">
                {error ? (
                  <p id={`${answerId}-error`} role="alert" className="font-semibold text-red-600">
                    {error}
                  </p>
                ) : (
                  <span id={hintId} className="text-muted-foreground">
                    {question.required ? "Bắt buộc" : "Không bắt buộc"}
                  </span>
                )}
                <span id={countId} className={`flex-none ${answerLength > maxScreeningAnswerLength ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                  {answerLength}/{maxScreeningAnswerLength} ký tự nội dung
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
