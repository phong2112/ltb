import { Briefcase, Building2, FileText, GraduationCap, Languages, NotebookPen, Sparkles } from "lucide-react";
import type { CvSummary } from "@/app/data";
import { cleanCvSummaryDisplayText, formatWorkExperience, getWorkExperienceItems, removeRedactedPhoneMarker, type WorkExperienceDisplayItem } from "@/app/utils/cv-summary";
import { SectionHeading } from "./SectionHeading";

type CvSummarySectionProps = {
  summary?: CvSummary | null;
  title: string;
  emptyOverview?: string;
  className?: string;
};

export function CvSummarySection({ summary, title, emptyOverview, className = "rounded-xl border border-border bg-white p-4 sm:p-5" }: CvSummarySectionProps) {
  const workExperiences = summary ? getWorkExperienceItems(summary) : [];

  return (
    <section className={className}>
      <SectionHeading icon={<FileText size={16} />} title={title} />
      <p className="mt-3 text-sm leading-6 text-foreground">{summary ? removeRedactedPhoneMarker(summary.overview) : emptyOverview}</p>
      {summary && <div className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <SummaryList icon={<Sparkles size={14} />} title="Kỹ năng chính" items={summary.keySkills} inline />
          <SummaryList icon={<NotebookPen size={14} />} title="Ghi chú nhanh cho TA" items={summary.notesForTa} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <SummaryList icon={<GraduationCap size={14} />} title="Học vấn" items={summary.education} />
            <SummaryList icon={<Languages size={14} />} title="Ngôn ngữ" items={summary.languages} inline />
            <WorkExperienceList icon={<Building2 size={14} />} title="Các công ty đã làm việc" items={workExperiences} />
          </div>
          <SummaryList icon={<Briefcase size={14} />} title="Kinh nghiệm nổi bật" items={summary.workHighlights} />
        </div>
      </div>}
    </section>
  );
}

function WorkExperienceList({ icon, title, items }: { icon: React.ReactNode; title: string; items: WorkExperienceDisplayItem[] }) {
  return <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"><span className="text-primary">{icon}</span> {title}</p>
    {items.length > 0 ? <ul className="mt-3 space-y-2">{items.map(item => <li key={`${item.company}:${item.title ?? ""}:${item.duration ?? ""}`} className="grid grid-cols-[8px_minmax(0,1fr)] gap-2 text-sm leading-6 text-foreground"><span className="mt-2 size-1.5 rounded-full bg-primary" /><span>{formatWorkExperience(item)}</span></li>)}</ul> : <p className="mt-3 text-sm font-semibold text-muted-foreground">—</p>}
  </div>;
}

function SummaryList({ icon, title, items, inline = false }: { icon: React.ReactNode; title: string; items: string[]; inline?: boolean }) {
  const visibleItems = items.map(cleanCvSummaryDisplayText).filter(Boolean);
  return <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"><span className="text-primary">{icon}</span> {title}</p>
    {visibleItems.length > 0 ? (inline ? <div className="mt-3 flex flex-wrap gap-1.5">{visibleItems.map(item => <span key={item} className="max-w-full rounded-full border border-border bg-white px-2.5 py-1 text-xs font-bold text-foreground">{item}</span>)}</div> : <ul className="mt-3 space-y-2">{visibleItems.map(item => <li key={item} className="grid grid-cols-[8px_minmax(0,1fr)] gap-2 text-sm leading-6 text-foreground"><span className="mt-2 size-1.5 rounded-full bg-primary" /><span>{item}</span></li>)}</ul>) : <p className="mt-3 text-sm font-semibold text-muted-foreground">—</p>}
  </div>;
}
