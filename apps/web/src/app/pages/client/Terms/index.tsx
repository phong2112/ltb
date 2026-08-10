import { useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, FileText } from "lucide-react";
import { useLanguage } from "@/app/services/i18n-service";
import PublicLayout from "@/app/layouts/PublicLayout";
import { renderLegalBody } from "@/app/utils/helpers/legal-renderer";
import { TERMS_CONTENT } from "./constants";

export default function Terms() {
  const { language, t } = useLanguage();
  const content = TERMS_CONTENT[language];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <PublicLayout>
      {/* Legal Page Header */}
      <div className="border-b border-border bg-gradient-to-br from-pink-50 to-background py-7">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ChevronLeft size={15} /> {t("common.home")}
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{content.badge}</p>
              <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {content.title}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {content.updatedLabel} <strong className="text-foreground">{content.updatedDate}</strong> · {content.updatedNote}
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Table Of Contents */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-8">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">{content.contentsLabel}</p>
          <ol className="space-y-1.5">
            {content.sections.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Legal Sections */}
        <div className="space-y-8">
          {content.sections.map((section, index) => (
            <div key={section.title} id={`section-${index}`} className="scroll-mt-20">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {section.title}
              </h2>
              <div className="space-y-2">{renderLegalBody(section.body)}</div>
              {index < content.sections.length - 1 && <div className="mt-8 border-b border-border" />}
            </div>
          ))}
        </div>

        {/* Legal CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-white p-4 text-center sm:p-6">
          <p className="text-sm text-muted-foreground mb-4">{content.acknowledgement}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/jobs" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
              {content.primaryCta}
            </Link>
            <Link to="/privacy" className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
