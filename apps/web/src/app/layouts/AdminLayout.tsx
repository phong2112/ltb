import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Briefcase, Users, Bell, MessageSquare,
  LogOut, ChevronRight, Settings, Languages, ArrowLeft, Menu, X
} from "lucide-react";
import { useData } from "@/app/data";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useLanguage, type Language } from "@/app/i18n";
import CandidateChatWidget from "@/app/components/CandidateChatWidget";

const logoImg = "/images/bich-candy-logo.jpg";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { jobs, candidateProfiles, logout } = useData();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const languages: Language[] = ["vi", "en"];
  const isChatRoute = loc.pathname === "/admin/chats" || loc.pathname.startsWith("/admin/chats/");

  const navItems = [
    { to: "/admin/dashboard", icon: <LayoutDashboard size={17} />, label: t("common.dashboard") },
    { to: "/admin/jobs", icon: <Briefcase size={17} />, label: t("common.jobs") },
    { to: "/admin/candidates", icon: <Users size={17} />, label: t("admin.candidatesNav") },
    { to: "/admin/chats", icon: <MessageSquare size={17} />, label: "Tin nhắn" },
    { to: "/admin/follow-up", icon: <Bell size={17} />, label: t("common.followUp") },
    { to: "/admin/templates", icon: <MessageSquare size={17} />, label: t("common.templates") },
    { to: "/admin/settings", icon: <Settings size={17} />, label: t("common.settings") },
  ];

  const breadcrumbLabels: Record<string, string> = {
    admin: t("common.hrWorkspace"),
    dashboard: t("common.dashboard"),
    jobs: t("common.jobs"),
    candidates: t("admin.candidatesNav"),
    chats: "Tin nhắn",
    "follow-up": t("common.followUp"),
    templates: t("common.templates"),
    settings: t("common.settings"),
    new: t("admin.newJob"),
    edit: t("admin.editJob"),
  };

  function getBreadcrumbLabel(segment: string, index: number, segments: string[]) {
    if (segments[index - 1] === "jobs" && segment !== "new") {
      return jobs.find(job => job.id === segment)?.title ?? t("common.loading");
    }

    if (segments[index - 1] === "candidates") {
      return candidateProfiles.find(candidate => candidate.id === segment)?.name ?? t("common.loading");
    }

    return breadcrumbLabels[segment] ?? segment;
  }

  async function handleLogout() {
    await logout();
    nav("/admin");
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const sidebarContent = (
    <>
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-pink-100">
            <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
          </div>
          <div className="min-w-0 leading-none">
            <div className="truncate text-sm font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Bích Candy</div>
            <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("common.hrWorkspace")}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(n => {
          const active = loc.pathname === n.to || (n.to !== "/admin/dashboard" && loc.pathname.startsWith(n.to));
          return (
            <Link
              key={n.to} to={n.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${active ? "bg-primary text-white" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}
            >
              {n.icon} {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-1 rounded-xl border border-border bg-background p-1 md:hidden" aria-label={t("common.language")}>
          <span className="px-2 text-muted-foreground"><Languages size={14} /></span>
          {languages.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setLanguage(item)}
              className={`h-8 flex-1 rounded-lg text-[11px] font-bold uppercase transition-all ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
              aria-pressed={language === item}
            >
              {item}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-red-50 hover:text-red-600">
          <LogOut size={17} /> {t("common.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-clip" style={{ fontFamily: "'Nunito', sans-serif", background: "#fdf6f0" }}>
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-white md:flex">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("common.hrWorkspace")}>
          <button
            type="button"
            className="absolute inset-0 bg-foreground/35 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
          />
          <aside className="relative flex h-full w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-border bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-pink-50 hover:text-primary"
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-white px-3 sm:px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex size-9 flex-none items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary md:hidden"
              aria-label="Mở menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={18} />
            </button>
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {loc.pathname.split("/").filter(Boolean).map((seg, i, arr) => (
              <span key={i} className={`${i === arr.length - 1 ? "flex" : "hidden sm:flex"} min-w-0 items-center gap-1`}>
                {i > 0 && <ChevronRight size={11} />}
                <span className={`max-w-32 truncate sm:max-w-48 lg:max-w-64 ${i === arr.length - 1 ? "font-semibold text-foreground" : ""}`}>{getBreadcrumbLabel(seg, i, arr)}</span>
              </span>
            ))}
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-white text-xs font-semibold text-muted-foreground transition-all hover:border-primary hover:text-primary lg:h-auto lg:w-auto lg:gap-2 lg:px-3 lg:py-1.5"
              aria-label={t("common.backToClient")}
            >
              <ArrowLeft size={13} /> <span className="hidden lg:inline">{t("common.backToClient")}</span>
            </Link>
            <div className="hidden items-center gap-1 rounded-full border border-border bg-white p-0.5 sm:flex" aria-label={t("common.language")}>
              <span className="pl-2 text-muted-foreground"><Languages size={13} /></span>
              {languages.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`h-7 px-2 rounded-full text-[11px] font-bold uppercase transition-all ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
                  aria-pressed={language === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="hidden text-xs font-semibold text-muted-foreground xl:inline">TA · Lường Bích</span>
            <div className="h-8 w-8 overflow-hidden rounded-full border border-primary/30 bg-pink-100 sm:h-7 sm:w-7">
              <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
      {!isChatRoute && <CandidateChatWidget />}
    </div>
  );
}
