import { type ReactNode, useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, Database, Eye, Mail, Shield, Trash2, UserCheck } from "lucide-react";
import { contactConfig } from "@/app/utils/configs/contact-config";
import { useLanguage } from "@/app/services/i18n-service";
import PublicLayout from "@/app/layouts/PublicLayout";
import { renderLegalBody } from "../legal-renderer";
import { PRIVACY_CONTENT, type HighlightKey } from "./constants";

const HIGHLIGHT_ICONS: Record<HighlightKey, ReactNode> = {
  minimization: <Database size={16} />,
  transparency: <Eye size={16} />,
  control: <UserCheck size={16} />,
  deletion: <Trash2 size={16} />,
};

export default function Privacy() {
  const { language, t } = useLanguage();
  const content = PRIVACY_CONTENT[language];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <PublicLayout>
      <div className="border-b border-border bg-gradient-to-br from-pink-50 to-background py-7">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ChevronLeft size={15} /> {t("common.home")}
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield size={20} />
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

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {content.highlights.map((highlight) => (
            <div key={highlight.key} className="flex items-start gap-3 p-4 bg-white border border-border rounded-2xl hover:border-primary/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{HIGHLIGHT_ICONS[highlight.key]}</div>
              <div>
                <p className="text-sm font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{highlight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{highlight.desc}</p>
              </div>
            </div>
          ))}
        </div>

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

        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Mail size={20} />
          </div>
          <div className="flex-1">
            <p className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{content.contactTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{content.contactBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${contactConfig.email}`} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
              {content.contactCta}
            </a>
            <Link to="/terms" className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
