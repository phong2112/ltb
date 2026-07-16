import { Link, useLocation } from "react-router";
import { LogIn } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import portraitImg from "@/imports/image.png";
import { useLanguage, type Language } from "@/app/i18n";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const languages: Language[] = ["vi", "en"];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={portraitImg} alt="Lường Bích" className="w-full h-full object-cover object-top" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-bold text-primary tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Lường Bích</div>
              <div className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{t("common.hrConsultant")}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <Link to="/" className={`hover:text-primary transition-colors ${loc.pathname === "/" ? "text-primary" : ""}`}>{t("common.home")}</Link>
            <Link to="/jobs" className={`hover:text-primary transition-colors ${loc.pathname.startsWith("/jobs") ? "text-primary" : ""}`}>{t("common.jobs")}</Link>
            <Link to="/candidate-guide" className={`hover:text-primary transition-colors ${loc.pathname === "/candidate-guide" ? "text-primary" : ""}`}>{t("common.candidateGuide")}</Link>
            <Link to="/contact" className={`hover:text-primary transition-colors ${loc.pathname === "/contact" ? "text-primary" : ""}`}>{t("common.contact")}</Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-border bg-white p-0.5" aria-label={t("common.language")}>
              {languages.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`h-8 px-2.5 rounded-full text-xs font-bold uppercase transition-all ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
                  aria-pressed={language === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link to="/admin" className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-full text-sm font-semibold hover:border-primary hover:text-primary transition-all">
              <LogIn size={15} /> {t("common.hrLogin")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={portraitImg} alt="Lường Bích" className="w-full h-full object-cover object-top" />
            </div>
            <span className="font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Lường Bích</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-semibold">
            <Link to="/terms" className="hover:text-primary transition-colors">{t("footer.terms")}</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">{t("footer.privacy")}</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">{t("footer.contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
