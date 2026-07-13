import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import ApplicationForm, { ApplicationJobSummary } from "@/app/components/ApplicationForm";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

export default function Apply() {
  const { id } = useParams();
  const { jobs, isLoading } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const job = jobs.find(item => item.id === id && item.status === "published");

  if (!job && isLoading) return (
    <PublicLayout>
      <div className="py-32 text-center text-sm font-semibold text-muted-foreground">{t("common.loading")}</div>
    </PublicLayout>
  );

  if (!job) return (
    <PublicLayout>
      <div className="py-32 text-center">
        <div className="mb-4 text-5xl">🌸</div>
        <p className="mb-2 text-xl font-bold">{t("apply.notFound")}</p>
        <Link to="/jobs" className="text-sm text-primary underline">{t("common.backToList")}</Link>
      </div>
    </PublicLayout>
  );

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link to={`/jobs/${job.id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ChevronLeft size={15} /> {t("apply.backToJd")}
        </Link>

        <ApplicationJobSummary job={job} />

        <div className="mt-6 rounded-2xl border border-border bg-white p-6">
          <h1 className="mb-5 text-xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("apply.formTitle")}</h1>
          <ApplicationForm job={job} onSuccess={() => navigate("/apply/success")} />
        </div>
      </div>
    </PublicLayout>
  );
}
