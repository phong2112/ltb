import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Briefcase, Users, Bell, MessageSquare,
  LogOut, ChevronRight, Settings, Languages, ArrowLeft
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

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Nunito', sans-serif", background: "#fdf6f0" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-border flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Bích Candy</div>
              <div className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-0.5">{t("common.hrWorkspace")}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(n => {
            const active = loc.pathname === n.to || (n.to !== "/admin/dashboard" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? "bg-primary text-white" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}
              >
                {n.icon} {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut size={17} /> {t("common.logout")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-border px-6 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {loc.pathname.split("/").filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight size={11} />}
                <span className={`max-w-64 truncate ${i === arr.length - 1 ? "text-foreground font-semibold" : ""}`}>{getBreadcrumbLabel(seg, i, arr)}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary hover:text-primary"
            >
              <ArrowLeft size={13} /> {t("common.backToClient")}
            </Link>
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-white p-0.5" aria-label={t("common.language")}>
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
            <span className="text-xs text-muted-foreground font-semibold">HR · Lường Thị Bích</span>
            <div className="h-7 w-7 overflow-hidden rounded-full border border-primary/30 bg-pink-100">
              <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
      {!isChatRoute && <CandidateChatWidget />}
    </div>
  );
}
