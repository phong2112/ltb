type Props = {
  questions: string[];
  disabled: boolean;
  layout: "wrap" | "row";
  onPick: (question: string) => void;
};

/** One-tap questions; FAQ questions are answered with the TA-approved text. */
export default function SuggestedQuestions({ questions, disabled, layout, onPick }: Props) {
  if (questions.length === 0) return null;

  const containerClass = layout === "wrap"
    ? "mt-4 flex flex-wrap justify-center gap-2"
    : "-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]";

  return (
    <div className={containerClass} role="list" aria-label="Câu hỏi gợi ý">
      {questions.map(question => (
        <button
          key={question}
          type="button"
          role="listitem"
          disabled={disabled}
          onClick={() => onPick(question)}
          className={`rounded-full border border-primary/40 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-45 ${layout === "row" ? "flex-none whitespace-nowrap" : ""}`}
        >
          {question}
        </button>
      ))}
    </div>
  );
}
