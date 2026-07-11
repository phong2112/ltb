import { Link } from "react-router";
import { CheckCircle, ArrowRight, Clock, Mail } from "lucide-react";
import { useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

export default function ApplySuccess() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 mb-6">
          <CheckCircle size={48} className="text-emerald-500" />
          <div className="absolute -top-1 -right-1 text-2xl">🌸</div>
        </div>

        <h1 className="text-3xl font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t("success.title")}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          {t("success.body")}
        </p>

        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 text-left space-y-3 mb-8">
          <h3 className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{t("success.nextSteps")}</h3>
          {[
            { icon: <Clock size={15} />, text: t("success.step1") },
            { icon: <Mail size={15} />, text: t("success.step2") },
            { icon: <CheckCircle size={15} />, text: t("success.step3") },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5 flex-shrink-0">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/jobs" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm">
            {t("success.browseJobs")} <ArrowRight size={15} />
          </Link>
          <Link to="/" className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-bold text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all">
            {t("success.home")}
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
