export function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/80 bg-background/55 px-3.5 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-border/80">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 line-clamp-2 break-words text-sm font-black leading-5 text-foreground" title={value}>
          {value}
        </dd>
      </div>
    </div>
  );
}
