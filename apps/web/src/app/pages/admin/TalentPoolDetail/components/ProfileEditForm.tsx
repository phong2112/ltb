import { BriefcaseBusiness, ExternalLink, Mail, NotebookPen, Phone, Tag, UserRound } from "lucide-react";
import type { ApiTalentPoolEntry } from "@/app/apis/models";
import { useLanguage } from "@/app/services/i18n-service";
import type { ProfileForm } from "@/app/pages/admin/TalentPoolDetail/types";
import { linkField } from "@/app/pages/admin/TalentPoolDetail/utils";
import { Field } from "./Field";

const inputClass = "h-10 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:border-primary";

type Props = {
  form: ProfileForm;
  entry: ApiTalentPoolEntry;
  updateField: (field: keyof ProfileForm, value: string) => void;
  t: ReturnType<typeof useLanguage>["t"];
};

export function ProfileEditForm({ form, entry, updateField, t }: Props) {
  const linkedinUrl = linkField(entry.structuredData?.linkedinUrl);
  const portfolioUrl = linkField(entry.structuredData?.portfolioUrl);

  return (
    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <UserRound size={16} className="text-primary" />
        <h2 className="text-base font-black text-foreground">{t("admin.personalInfo")}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("admin.fullName")} icon={<UserRound size={14} />}>
          <input value={form.fullName} onChange={event => updateField("fullName", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t("talentPool.titleLabel")} icon={<BriefcaseBusiness size={14} />}>
          <input value={form.title} onChange={event => updateField("title", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t("common.email")} icon={<Mail size={14} />}>
          <input type="email" value={form.email} onChange={event => updateField("email", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t("admin.phone")} icon={<Phone size={14} />}>
          <input value={form.phone} onChange={event => updateField("phone", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t("talentPool.skills")} icon={<Tag size={14} />} wide>
          <input value={form.skills} onChange={event => updateField("skills", event.target.value)} placeholder={t("talentPool.commaSeparated")} className={inputClass} />
        </Field>
        <Field label={t("admin.hrNote")} icon={<NotebookPen size={14} />} wide>
          <textarea rows={4} value={form.notes} onChange={event => updateField("notes", event.target.value)} className={`${inputClass} h-auto resize-y`} />
        </Field>
      </div>
      {(linkedinUrl || portfolioUrl) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {linkedinUrl && <ProfileLink href={linkedinUrl} label="LinkedIn" />}
          {portfolioUrl && <ProfileLink href={portfolioUrl} label="Portfolio" />}
        </div>
      )}
    </section>
  );
}

function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-primary hover:bg-pink-50">
      {label}<ExternalLink size={12} />
    </a>
  );
}
