import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bell, Briefcase, Languages, Mail, Save, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import { useLanguage, type Language } from "@/app/i18n";
import { Switch } from "@/app/components/ui/switch";

type WorkspaceSettings = {
  defaultView: "candidates" | "jobs";
  compactTables: boolean;
  emailAlerts: boolean;
  followUpReminders: boolean;
  privateCvAccess: boolean;
  requireConsent: boolean;
};

const STORAGE_KEY = "hr-copilot-admin-settings";

const defaultSettings: WorkspaceSettings = {
  defaultView: "candidates",
  compactTables: true,
  emailAlerts: true,
  followUpReminders: true,
  privateCvAccess: true,
  requireConsent: true,
};

export default function AdminSettings() {
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const languages: Language[] = ["vi", "en"];

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<WorkspaceSettings> | null;
      if (parsed) setSettings({ ...defaultSettings, ...parsed });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  function updateSetting<Key extends keyof WorkspaceSettings>(key: Key, value: WorkspaceSettings[Key]) {
    setSettings(current => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("settings.title")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("settings.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90"
          >
            <Save size={15} /> {saved ? t("admin.saved") : t("settings.save")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-white p-5">
            <SectionHeader icon={<SlidersHorizontal size={17} />} title={t("settings.userInterface")} description={t("settings.userInterfaceDesc")} />

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Languages size={15} className="text-primary" /> {t("common.language")}
                </div>
                <div className="flex items-center rounded-full border border-border bg-white p-0.5 w-fit" aria-label={t("common.language")}>
                  {languages.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLanguage(item)}
                      className={`h-9 px-3 rounded-full text-xs font-bold uppercase transition-all ${language === item ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
                      aria-pressed={language === item}
                    >
                      {item === "vi" ? t("settings.vietnamese") : t("settings.english")}
                    </button>
                  ))}
                </div>
              </div>

              <SettingRow
                icon={<Briefcase size={15} />}
                title={t("settings.defaultView")}
                description={t("settings.defaultViewDesc")}
                control={
                  <select
                    value={settings.defaultView}
                    onChange={event => updateSetting("defaultView", event.target.value as WorkspaceSettings["defaultView"])}
                    className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  >
                    <option value="candidates">{t("admin.candidatesNav")}</option>
                    <option value="jobs">{t("common.jobs")}</option>
                  </select>
                }
              />

              <SettingRow
                icon={<SlidersHorizontal size={15} />}
                title={t("settings.compactTables")}
                description={t("settings.compactTablesDesc")}
                control={<Switch checked={settings.compactTables} onCheckedChange={checked => updateSetting("compactTables", checked)} />}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5">
            <SectionHeader icon={<UserCog size={17} />} title={t("settings.adminInterface")} description={t("settings.adminInterfaceDesc")} />

            <div className="space-y-3">
              <SettingRow
                icon={<Mail size={15} />}
                title={t("settings.emailAlerts")}
                description={t("settings.emailAlertsDesc")}
                control={<Switch checked={settings.emailAlerts} onCheckedChange={checked => updateSetting("emailAlerts", checked)} />}
              />
              <SettingRow
                icon={<Bell size={15} />}
                title={t("settings.followUpReminders")}
                description={t("settings.followUpRemindersDesc")}
                control={<Switch checked={settings.followUpReminders} onCheckedChange={checked => updateSetting("followUpReminders", checked)} />}
              />
              <SettingRow
                icon={<ShieldCheck size={15} />}
                title={t("settings.privateCvAccess")}
                description={t("settings.privateCvAccessDesc")}
                control={<Switch checked={settings.privateCvAccess} onCheckedChange={checked => updateSetting("privateCvAccess", checked)} />}
              />
              <SettingRow
                icon={<ShieldCheck size={15} />}
                title={t("settings.requireConsent")}
                description={t("settings.requireConsentDesc")}
                control={<Switch checked={settings.requireConsent} onCheckedChange={checked => updateSetting("requireConsent", checked)} />}
              />
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-primary">{icon}</div>
      <div>
        <h2 className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, description, control }: { icon: ReactNode; title: string; description: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}
