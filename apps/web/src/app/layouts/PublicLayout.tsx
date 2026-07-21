import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { LogIn, Menu, X } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import portraitImg from "@/imports/image.png";
import { useLanguage, type Language } from "@/app/i18n";

export default function PublicLayout({ children, hasMobileBottomBar = false }: { children: React.ReactNode; hasMobileBottomBar?: boolean }) {
  const loc = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const languages: Language[] = ["vi", "en"];
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
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="size-8 flex-none overflow-hidden rounded-full border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={portraitImg} alt="Lường Bích" className="w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0 leading-none">
              <div className="truncate text-sm font-bold tracking-wide text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Lường Bích</div>
              <div className="mt-0.5 hidden truncate text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:block">{t("common.hrConsultant")}</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} className={`transition-colors hover:text-primary ${item.active ? "text-primary" : ""}`} aria-current={item.active ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-none items-center gap-1.5 sm:gap-2">
            <div className="flex items-center rounded-full border border-border bg-white p-0.5" aria-label={t("common.language")}>
              {languages.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`h-7 rounded-full px-2 text-[11px] font-bold uppercase transition-all sm:h-8 sm:px-2.5 sm:text-xs ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
                  aria-pressed={language === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link
              to="/admin"
              aria-label={t("common.hrLogin")}
              title={t("common.hrLogin")}
              className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-all hover:border-primary hover:text-primary sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-semibold"
            >
              <LogIn size={15} /> <span className="hidden sm:inline">{t("common.hrLogin")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(open => !open)}
              className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-all hover:border-primary hover:text-primary md:hidden"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-navigation"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav id="public-mobile-navigation" className="grid grid-cols-2 gap-2 border-t border-border bg-white px-4 py-3 md:hidden">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-10 items-center justify-center rounded-xl px-3 text-center text-sm font-bold transition-colors ${item.active ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className={`border-t border-border bg-white pt-8 lg:py-8 ${hasMobileBottomBar ? "pb-28" : "pb-8"}`}>
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
