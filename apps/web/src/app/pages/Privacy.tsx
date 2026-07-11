import { useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, Database, Eye, Mail, Shield, Trash2, UserCheck } from "lucide-react";
import { contactConfig } from "@/app/contact-config";
import PublicLayout from "@/app/layouts/PublicLayout";

const HIGHLIGHTS = [
  { icon: <Database size={16} />, title: "Data minimization", desc: "We collect only the information needed for recruitment." },
  { icon: <Eye size={16} />, title: "Transparency", desc: "You know what data is collected and how it is used." },
  { icon: <UserCheck size={16} />, title: "Your control", desc: "You may request access, correction, or deletion of your data." },
  { icon: <Trash2 size={16} />, title: "Deletion when no longer needed", desc: "Data is deleted after 24 months from the last interaction." },
];

const SECTIONS = [
  {
    title: "1. What information do we collect?",
    body: `When you use the platform, we may collect the following categories of information:

**1.1 Information you provide directly:**
- Full name
- Email address
- Phone number
- CV, portfolio, or personal profile links
- Cover notes and screening answers
- Notes or messages you send to us

**1.2 Information collected automatically:**
- IP address and browser information, used only for security
- Pages visited and time spent, in aggregated and anonymized form
- Device type, such as desktop or mobile

**1.3 Information we do NOT collect:**
- Financial or credit card information
- Biometric data
- Information that is not necessary for recruitment purposes`,
  },
  {
    title: "2. Why do we collect information?",
    body: `Your data is used for the following purposes:

- **Application processing**: Share information with the relevant employer and arrange interviews.
- **Communication**: Provide application status updates, interview notices, and HR feedback.
- **Service improvement**: Analyze anonymized data to improve the user experience.
- **Legal compliance**: Retain records where legally required.
- **Talent pool**: With your consent, keep your information to connect you with future opportunities.

We **do not** sell, rent, or share your data with third parties for commercial purposes.`,
  },
  {
    title: "3. Who can access your information?",
    body: `**Relevant employers:**
When you apply for a role, your application information, including name, email, CV, and cover note, is shared with the employer for that role only. Employers are expected to keep information confidential under our Terms of Use.

**HR Consultant:**
Lường Thị Bích and direct assistants, if any, may access application profiles to support the recruitment process.

**Technical service providers:**
Infrastructure providers, such as hosting and email services, may process data under confidentiality obligations. They may not use your data for their own purposes.

**Legal authorities:**
Only when required by a court order or mandatory legal obligation.`,
  },
  {
    title: "4. How long do we retain data?",
    body: `- **Rejected applications**: Deleted after **12 months** from the decision date, unless you consent to join the talent pool.
- **Talent pool profiles**: Kept for up to **24 months** after the last interaction. You may request earlier deletion at any time.
- **Hired candidate records**: Retained as required by employment record laws, up to 5 years.
- **Technical logs**: Automatically deleted after 90 days.

After these periods, data will be permanently deleted or fully anonymized.`,
  },
  {
    title: "5. Your rights over personal data",
    body: `Under Vietnamese law and international data protection standards, you have the following rights:

**Right to access:**
Request a copy of the personal information we hold about you.

**Right to rectification:**
Request correction of inaccurate or incomplete information.

**Right to erasure:**
Request deletion of your personal data, unless we are legally required to retain it.

**Right to object:**
Object to processing for specific purposes, such as marketing.

**Right to withdraw consent:**
Withdraw consent at any time without affecting the lawfulness of earlier processing.

To exercise these rights, send your request to **${contactConfig.email}**. We will respond within **7 business days**.`,
  },
  {
    title: "6. Data security",
    body: `We apply appropriate technical and organizational measures to protect your data:

- **HTTPS encryption** for all connections to the platform.
- **Strict access control** so only authorized personnel can access candidate data.
- **No plaintext passwords**; passwords are hashed using a secure algorithm.
- **Regular backups** to reduce data loss from technical incidents.

However, no system is completely secure. If a security incident affects your data, we will notify you within 72 hours where required.`,
  },
  {
    title: "7. Cookies and tracking technologies",
    body: "The platform uses necessary cookies to function properly, such as maintaining login sessions. We **do not** use advertising tracking cookies or share browsing behavior with third parties.\n\nYou may disable cookies in your browser settings, but some features may not work correctly.",
  },
  {
    title: "8. Children and users under 18",
    body: "The platform is not intended for users under 18 and does not knowingly collect children's personal information. If you believe a person under 18 has provided personal data, please contact us so we can delete it promptly.",
  },
  {
    title: "9. Changes to this policy",
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. If there are material changes, we will notify you by email, if provided, or display a prominent notice on the platform.

Last updated: **July 10, 2026**.`,
  },
  {
    title: "10. Privacy contact",
    body: `If you have questions, concerns, or want to exercise your rights:

**Lường Thị Bích — HR Consultant**
Email: ${contactConfig.email}
Response time: Within 7 business days

You may also file a complaint with the competent data protection authority in Vietnam if you believe your rights have been violated.`,
  },
];

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderBody(text: string) {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-2" />;
    if (line.startsWith("- ")) {
      return (
        <li key={index} className="ml-4 text-sm text-foreground leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    }

    return (
      <p key={index} className="text-sm text-foreground leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });
}

export default function Privacy() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-pink-50 to-background border-b border-border py-10">
        <div className="max-w-3xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-5">
            <ChevronLeft size={15} /> Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Legal</p>
              <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                Privacy Policy
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: <strong className="text-foreground">July 10, 2026</strong> · We value your privacy.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {HIGHLIGHTS.map((highlight) => (
            <div key={highlight.title} className="flex items-start gap-3 p-4 bg-white border border-border rounded-2xl hover:border-primary/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{highlight.icon}</div>
              <div>
                <p className="text-sm font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{highlight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{highlight.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-8">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Contents</p>
          <ol className="space-y-1.5">
            {SECTIONS.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section, index) => (
            <div key={section.title} id={`section-${index}`} className="scroll-mt-20">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {section.title}
              </h2>
              <div className="space-y-2">{renderBody(section.body)}</div>
              {index < SECTIONS.length - 1 && <div className="mt-8 border-b border-border" />}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white border border-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Mail size={20} />
          </div>
          <div className="flex-1">
            <p className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Questions about privacy?</p>
            <p className="text-xs text-muted-foreground mt-0.5">We aim to respond within 7 business days.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${contactConfig.email}`} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
              Send email
            </a>
            <Link to="/terms" className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
