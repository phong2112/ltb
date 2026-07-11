import { useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, FileText } from "lucide-react";
import { contactConfig } from "@/app/contact-config";
import PublicLayout from "@/app/layouts/PublicLayout";

const SECTIONS = [
  {
    title: "1. Introduction",
    body: `Welcome to the recruiting platform operated by **Lường Thị Bích — HR Consultant** ("we", "us", "our", or "the platform"). By accessing or using this website, you agree to comply with the terms and conditions below.

Please read these Terms carefully before using the service. If you do not agree with any part of these Terms, please stop using the platform immediately.`,
  },
  {
    title: "2. Definitions",
    body: `- **Platform**: The recruiting website on this domain, including all related pages and features.
- **Candidate**: An individual who uses the platform to search for job opportunities and submit applications.
- **Employer**: A company or organization that publishes job openings through the platform.
- **HR Consultant**: Lường Thị Bích, the individual operating and managing this platform.
- **Personal data**: Information that can identify you, including full name, email address, phone number, and CV.`,
  },
  {
    title: "3. Conditions of Use",
    body: `When using the platform, you agree to:

- Provide accurate, truthful, and complete information in your application.
- Not use the platform for fraud, deception, or any activity that violates Vietnamese law.
- Not collect information about other users without consent.
- Not publish offensive, discriminatory, or intellectual-property-infringing content.
- Not intentionally damage, disrupt, or gain unauthorized access to the system.

We may reject, suspend, or remove accounts or profiles that violate these Terms without prior notice.`,
  },
  {
    title: "4. Candidate Rights and Responsibilities",
    body: `**Candidate rights:**
- Search, view, and apply to publicly posted job openings on the platform.
- Request correction or deletion of personal data as described in the Privacy Policy.
- Receive a response from HR within a reasonable period after submitting an application.

**Candidate responsibilities:**
- Be responsible for the accuracy of the information and CV you provide.
- Respect confirmed interview schedules and give at least 24 hours' notice if you need to cancel.
- Keep employer information received during the recruitment process confidential.`,
  },
  {
    title: "5. Employer Rights and Responsibilities",
    body: `**Employer rights:**
- Publish lawful job openings and access relevant candidate profiles.
- Request support from the HR Consultant for screening, advisory, and candidate connection activities.

**Employer responsibilities:**
- Publish truthful, clear, and non-misleading recruitment information.
- Use candidate information only for the agreed recruitment purpose.
- Communicate with candidates professionally and respectfully, regardless of the hiring outcome.
- Comply with Vietnamese labor law in all hiring decisions.`,
  },
  {
    title: "6. Limitation of Liability",
    body: `The platform acts as a connection point between candidates and employers. We do not guarantee that:
- A candidate will receive a job offer after applying.
- An employer will find a suitable candidate within a specific period.
- Information provided by any party is completely accurate.

We are not liable for losses arising from hiring decisions, inaccurate user-provided content, or service interruptions outside our reasonable control.`,
  },
  {
    title: "7. Intellectual Property",
    body: `All content on the platform, including interface design, logos, text, and images, belongs to Lường Thị Bích HR Consultant unless otherwise stated.

You may not copy, distribute, modify, or commercially use any content without our written consent.`,
  },
  {
    title: "8. Changes to These Terms",
    body: `We may update these Terms of Use at any time. Changes take effect when posted on the platform. Continued use of the service after changes are posted means you accept the updated Terms.

Last updated: **July 10, 2026**.`,
  },
  {
    title: "9. Governing Law and Dispute Resolution",
    body: "These Terms are governed by the laws of Vietnam. Any dispute will first be addressed through good-faith negotiation. If no agreement is reached, the dispute will be submitted to the competent People's Court in Hanoi, Vietnam.",
  },
  {
    title: "10. Contact",
    body: `If you have questions about these Terms of Use, please contact:

**Lường Thị Bích — HR Consultant**
Email: ${contactConfig.email}
Zalo/Phone: Please contact us through the website form`,
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

export default function Terms() {
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
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Legal</p>
              <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                Terms of Use
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: <strong className="text-foreground">July 10, 2026</strong> · Effective when you use the platform.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
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

        <div className="mt-12 p-6 bg-white border border-border rounded-2xl text-center">
          <p className="text-sm text-muted-foreground mb-4">
            By using the platform, you confirm that you have read and agree to these Terms of Use.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/jobs" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
              View jobs
            </Link>
            <Link to="/privacy" className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
