import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { LogIn, Menu, X } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import portraitImg from "@/imports/image.png";
import { useLanguage, type Language } from "@/app/i18n";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const languages: Language[] = ["vi", "en"];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { to: "/", label: t("common.home"), active: loc.pathname === "/" },
    { to: "/jobs", label: t("common.jobs"), active: loc.pathname.startsWith("/jobs") },
    { to: "/candidate-guide", label: t("common.candidateGuide"), active: loc.pathname === "/candidate-guide" },
    { to: "/contact", label: t("common.contact"), active: loc.pathname === "/contact" },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={portraitImg} alt="Lường Bích" className="w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0 leading-none">
              <div className="text-sm font-bold text-primary tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Lường Bích</div>
              <div className="hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground min-[390px]:block">{t("common.hrConsultant")}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} className={`transition-colors hover:text-primary ${item.active ? "text-primary" : ""}`}>{item.label}</Link>
            ))}
          </nav>

          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center rounded-full border border-border bg-white p-0.5 min-[390px]:flex" aria-label={t("common.language")}>
              {languages.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`h-8 rounded-full px-2 text-xs font-bold uppercase transition-all sm:px-2.5 ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
                  aria-pressed={language === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link to="/admin" className="flex h-9 items-center gap-2 rounded-full border border-border px-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary sm:px-4">
              <LogIn size={15} /> <span className="hidden sm:inline">{t("common.hrLogin")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(open => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground md:hidden"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-border bg-white px-4 pb-4 pt-3 shadow-sm md:hidden">
            <nav className="grid gap-1">
              {navItems.map(item => (
                <Link key={item.to} to={item.to} className={`rounded-xl px-3 py-2.5 text-sm font-bold ${item.active ? "bg-primary text-white" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 min-[390px]:hidden">
              <span className="text-xs font-bold text-muted-foreground">{t("common.language")}</span>
              <div className="flex rounded-full border border-border bg-white p-0.5">
                {languages.map(item => (
                  <button key={item} type="button" onClick={() => setLanguage(item)} className={`h-8 rounded-full px-3 text-xs font-bold uppercase ${language === item ? "bg-primary text-white" : "text-muted-foreground"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-6 md:flex-row">
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
