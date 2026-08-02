import { Users } from "lucide-react";

type ApplicantsHeaderProps = {
  count: number;
  subtitle: string;
  title: string;
};

export function ApplicantsHeader({ count, subtitle, title }: ApplicantsHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-pink-50/90 via-white to-white p-5">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">{subtitle}</p>
        <h2 className="flex items-center gap-2 truncate text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          <Users size={18} className="flex-none text-primary" /> {title}
        </h2>
      </div>
      <div className="flex h-11 min-w-11 flex-none items-center justify-center rounded-2xl bg-white px-3 text-base font-black tabular-nums text-primary shadow-sm ring-1 ring-border">
        {count}
      </div>
    </div>
  );
}

