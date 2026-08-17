export function Field({ label, icon, wide, children }: {
  label: string;
  icon: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">{icon}{label}</span>
      {children}
    </label>
  );
}
