import { Briefcase, Building2, DollarSign, MapPin } from "lucide-react";
import { translateJobLevel, translateJobType } from "@/app/services/i18n-service";
import RichTextContent from "@/app/components/RichTextContent";
import type { JobDetailSharedProps } from "../types";

export function JobDetailContent({ job, language, salary, t }: JobDetailSharedProps) {
  const sections = [
    [t("jobDetail.description"), job.description],
    [t("jobDetail.requirements"), job.requirements],
    [t("jobDetail.benefits"), job.benefits],
  ] as const;

  return (
    <>
      <div className="grid gap-2 rounded-xl bg-pink-50/60 p-4 text-xs text-muted-foreground sm:grid-cols-2">
        <span className="flex items-center gap-2"><Building2 size={13} className="text-primary" />{job.company}</span>
        <span className="flex items-center gap-2"><MapPin size={13} className="text-primary" />{job.location}</span>
        <span className="flex items-center gap-2"><Briefcase size={13} className="text-primary" />{translateJobType(job.type, language)} · {translateJobLevel(job.level, language)}</span>
        <span className="flex items-center gap-2"><DollarSign size={13} className="text-primary" />{salary}</span>
      </div>
      {sections.map(([title, content]) => (
        <section key={title}>
          <h3 className="mb-3 text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>
          {content ? <RichTextContent value={content} className="text-sm text-foreground" /> : <p className="text-sm text-muted-foreground">—</p>}
        </section>
      ))}
    </>
  );
}

