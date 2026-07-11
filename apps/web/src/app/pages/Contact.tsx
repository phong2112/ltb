import { type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Briefcase, Check, CheckCircle, Copy, Linkedin, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { contactConfig } from "@/app/contact-config";
import { useLanguage } from "@/app/i18n";

export default function Contact() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(t("contact.mailSubject"));
    const body = encodeURIComponent(`${t("contact.nameLabel")}: ${name}\n${t("common.email")}: ${email}\n\n${message}`);
    return `mailto:${contactConfig.email}?subject=${subject}&body=${body}`;
  }, [email, message, name, t]);

  async function copyContactValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(current => (current === key ? null : current)), 1600);
  }

  const contactItems = [
    { key: "email", icon: <Mail size={17} />, title: t("contact.emailTitle"), body: contactConfig.email, href: `mailto:${contactConfig.email}`, copyValue: contactConfig.email },
    { key: "messenger", icon: <MessageCircle size={17} />, title: t("contact.messengerTitle"), body: t("contact.messengerBody"), href: contactConfig.messengerUrl, copyValue: contactConfig.messengerUrl },
    { key: "linkedin", icon: <Linkedin size={17} />, title: t("contact.linkedinTitle"), body: t("contact.linkedinBody"), href: contactConfig.linkedinUrl, copyValue: contactConfig.linkedinUrl },
    { key: "phone", icon: <Phone size={17} />, title: t("contact.phoneTitle"), body: contactConfig.phoneDisplay, href: contactConfig.phoneHref, copyValue: contactConfig.phoneDisplay },
    { key: "location", icon: <MapPin size={17} />, title: t("contact.locationTitle"), body: t("contact.locationBody"), copyValue: t("contact.locationBody") },
  ];

  return (
    <PublicLayout>
      <section className="border-b border-pink-100 bg-[#fff7fa]">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-primary">
                <MessageCircle size={13} /> {t("contact.eyebrow")}
              </div>
              <h1 className="mt-5 text-4xl md:text-5xl font-black leading-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t("contact.title")}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{t("contact.subtitle")}</p>
            </div>
            <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {contactItems.map(item => (
                  <ContactItem
                    key={item.key}
                    icon={item.icon}
                    title={item.title}
                    body={item.body}
                    href={item.href}
                    copied={copiedKey === item.key}
                    copyLabel={copiedKey === item.key ? t("common.copied") : t("common.copy")}
                    onCopy={() => copyContactValue(item.key, item.copyValue)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-black text-foreground">{t("contact.formTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("contact.formSubtitle")}</p>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contact-name">{t("contact.nameLabel")}</Label>
                <Input id="contact-name" value={name} onChange={event => setName(event.target.value)} placeholder={t("contact.namePlaceholder")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">{t("common.email")}</Label>
                <Input id="contact-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={t("contact.emailPlaceholder")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-message">{t("contact.messageLabel")}</Label>
                <Textarea id="contact-message" value={message} onChange={event => setMessage(event.target.value)} placeholder={t("contact.messagePlaceholder")} className="min-h-32" />
              </div>
              <div>
                <Button asChild className="rounded-full">
                  <a href={mailHref}><Mail size={15} /> {t("contact.sendEmail")}</a>
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-pink-100 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">{t("contact.forCandidatesTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("contact.forCandidatesSubtitle")}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[t("contact.pointCv"), t("contact.pointRole"), t("contact.pointTimeline")].map(point => (
                <div key={point} className="flex items-start gap-2 rounded-xl border border-pink-100 bg-pink-50/50 p-3 text-sm font-semibold text-foreground">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <Link to="/jobs" className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-pink-200 px-5 text-sm font-bold text-primary hover:border-primary transition-colors">
              {t("contact.browseJobs")} <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}

function ContactItem({
  icon,
  title,
  body,
  href,
  copied,
  copyLabel,
  onCopy,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  href?: string;
  copied: boolean;
  copyLabel: string;
  onCopy: () => void;
}) {
  const details = (
    <>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <p className="mt-0.5 break-words text-sm font-black text-foreground">{body}</p>
      </div>
    </>
  );

  return (
    <div className="flex items-start gap-2 rounded-xl border border-pink-100 bg-pink-50/40 p-3 transition-colors hover:bg-pink-50">
      {href ? (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex min-w-0 flex-1 items-start gap-3">
          {details}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{details}</div>
      )}
      <button
        type="button"
        onClick={onCopy}
        title={copyLabel}
        aria-label={`${copyLabel}: ${body}`}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-white transition-colors ${copied ? "border-emerald-200 text-emerald-600" : "border-pink-100 text-muted-foreground hover:border-primary hover:text-primary"}`}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}
