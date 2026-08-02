export function AnalysisGroup({
  icon,
  title,
  items,
  emptyText,
  tone,
  bulletClass,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone: string;
  bulletClass: string;
}) {
  return (
    <div className="p-5">
      <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone}`}>
        {icon} {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2.5 text-xs leading-5 text-foreground">
              <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletClass}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

