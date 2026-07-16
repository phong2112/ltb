import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ArrowLeft, Lock, Mail, Eye, EyeOff, Sparkles } from "lucide-react";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/i18n";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { contactConfig } from "@/app/contact-config";

const logoImg = "/images/bich-candy-logo.jpg";
const SETTINGS_STORAGE_KEY = "hr-copilot-admin-settings";
const LOCAL_ADMIN_PASSWORD = "demo123";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function getDefaultAdminPath() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "null") as { defaultView?: unknown } | null;
    if (parsed?.defaultView === "jobs") return "/admin/jobs";
    if (parsed?.defaultView === "candidates") return "/admin/candidates";
  } catch {
    return "/admin/dashboard";
  }

  return "/admin/dashboard";
}

function shouldPrefillLocalCredentials() {
  return typeof window !== "undefined" && LOCAL_HOSTNAMES.has(window.location.hostname);
}

export default function AdminLogin() {
  const { login, isAdminLoggedIn } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const shouldPrefillCredentials = shouldPrefillLocalCredentials();
  const [email, setEmail] = useState<string>(shouldPrefillCredentials ? contactConfig.email : "");
  const [password, setPassword] = useState(shouldPrefillCredentials ? LOCAL_ADMIN_PASSWORD : "");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAdminLoggedIn) return <Navigate to={getDefaultAdminPath()} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      setLoading(false);
      if (result.ok) navigate(getDefaultAdminPath());
      else setError(t(result.reason === "invalidCredentials" ? "admin.loginError" : "admin.loginApiUnavailable"));
    } catch {
      setLoading(false);
      setError(t("admin.loginApiUnavailable"));
    }
  }

  return (
    <div className="relative min-h-screen flex" style={{ fontFamily: "'Nunito', sans-serif", background: "linear-gradient(135deg, #fdf0f4 0%, #fde8ef 100%)" }}>
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-border bg-white/90 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary hover:text-primary"
      >
        <ArrowLeft size={15} /> {t("common.backToClient")}
      </Link>

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[45%] bg-primary text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="mb-4 h-14 w-14 overflow-hidden rounded-full border-2 border-white/70 bg-white">
            <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Bích Candy<br />{t("common.hrWorkspace")}</h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs">
            {t("admin.workspaceIntro")}
          </p>
          <div className="mt-10 space-y-3">
            {[t("admin.featureManage"), t("admin.featureAi"), t("admin.featureFollowUp"), t("admin.featureTemplates")].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/90">
                <Sparkles size={13} className="text-white/70" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full border-2 border-primary/30 bg-pink-100">
              <ImageWithFallback src={logoImg} alt="Bích Candy" className="h-full w-full object-cover object-[50%_58%]" />
            </div>
            <h2 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.loginTitle")}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t("admin.privateArea")}</p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block uppercase tracking-wide">{t("common.email")}</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                    placeholder={shouldPrefillCredentials ? contactConfig.email : "you@example.com"}
                    className="w-full pl-9 pr-3 py-2.5 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block uppercase tracking-wide">{t("admin.password")}</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60"
              >
                {loading ? t("admin.loginLoading") : t("admin.loginSubmit")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
