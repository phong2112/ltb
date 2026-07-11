import { Link } from "react-router";
import { ArrowRight, CheckCircle, ClipboardList, FileText, MessageCircle, SearchCheck, Sparkles } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { useLanguage } from "@/app/i18n";

export default function CandidateGuide() {
  const { t } = useLanguage();

  const steps = [
    { icon: <SearchCheck size={18} />, title: t("guide.stepFindTitle"), body: t("guide.stepFindBody") },
    { icon: <FileText size={18} />, title: t("guide.stepCvTitle"), body: t("guide.stepCvBody") },
    { icon: <MessageCircle size={18} />, title: t("guide.stepInterviewTitle"), body: t("guide.stepInterviewBody") },
  ];

  const checklist = [
    t("guide.checklistCv"),
    t("guide.checklistPortfolio"),
    t("guide.checklistSalary"),
    t("guide.checklistQuestions"),
  ];

  return (
    <PublicLayout>
      <section className="border-b border-pink-100" style={{ background: "linear-gradient(135deg, #fff7fa 0%, #fdebf1 58%, #fff 100%)" }}>
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-primary">
              <Sparkles size={13} /> {t("guide.eyebrow")}
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-black leading-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("guide.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t("guide.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/jobs" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                {t("guide.browseJobs")} <ArrowRight size={15} />
              </Link>
              <Link to="/contact" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-pink-200 bg-white px-5 text-sm font-bold text-primary hover:border-primary transition-colors">
                {t("guide.askHr")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(step => (
            <article key={step.title} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {step.icon}
              </div>
              <h2 className="text-base font-black text-foreground">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-2xl border border-border bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-primary">
                <ClipboardList size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">{t("guide.checklistTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("guide.checklistSubtitle")}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {checklist.map(item => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-pink-100 bg-pink-50/50 p-3 text-sm font-semibold text-foreground">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl border border-primary/20 bg-primary p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t("guide.noteEyebrow")}</p>
            <h2 className="mt-3 text-2xl font-black leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("guide.noteTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85">{t("guide.noteBody")}</p>
            <Link to="/contact" className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-primary hover:bg-pink-50 transition-colors">
              {t("common.contact")} <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
