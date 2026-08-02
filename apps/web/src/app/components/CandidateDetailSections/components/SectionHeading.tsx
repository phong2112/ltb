export function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-primary">
      {icon}
      <h2 className="truncate text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h2>
    </div>
  );
}

