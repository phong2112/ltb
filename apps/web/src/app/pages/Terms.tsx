import { useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, FileText } from "lucide-react";
import { contactConfig } from "@/app/contact-config";
import { type Language, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

type LegalSection = {
  title: string;
  body: string;
};

type TermsPageContent = {
  badge: string;
  title: string;
  updatedLabel: string;
  updatedDate: string;
  updatedNote: string;
  contentsLabel: string;
  acknowledgement: string;
  primaryCta: string;
  secondaryCta: string;
  sections: LegalSection[];
};

const CONTENT: Record<Language, TermsPageContent> = {
  vi: {
    badge: "Pháp lý",
    title: "Điều khoản sử dụng",
    updatedLabel: "Ngày cập nhật:",
    updatedDate: "10 tháng 7, 2026",
    updatedNote: "Có hiệu lực khi bạn sử dụng nền tảng.",
    contentsLabel: "Mục lục",
    acknowledgement: "Khi sử dụng nền tảng, bạn xác nhận rằng mình đã đọc, hiểu và đồng ý với các Điều khoản sử dụng này.",
    primaryCta: "Xem việc làm",
    secondaryCta: "Chính sách quyền riêng tư",
    sections: [
      {
        title: "1. Giới thiệu",
        body: `Chào mừng bạn đến với nền tảng tuyển dụng do **Lường Bích — Tư vấn tuyển dụng** vận hành ("chúng tôi", "của chúng tôi", hoặc "nền tảng"). Khi truy cập hoặc sử dụng website này, bạn đồng ý tuân thủ các điều khoản và điều kiện dưới đây.

Vui lòng đọc kỹ các Điều khoản này trước khi sử dụng dịch vụ. Nếu bạn không đồng ý với bất kỳ nội dung nào trong Điều khoản, vui lòng ngừng sử dụng nền tảng ngay lập tức.`,
      },
      {
        title: "2. Định nghĩa",
        body: `- **Nền tảng**: Website tuyển dụng trên tên miền này, bao gồm tất cả các trang và tính năng liên quan.
- **Ứng viên**: Cá nhân sử dụng nền tảng để tìm kiếm cơ hội việc làm và gửi hồ sơ ứng tuyển.
- **Nhà tuyển dụng**: Công ty hoặc tổ chức đăng tin tuyển dụng thông qua nền tảng.
- **Tư vấn tuyển dụng**: Lường Bích, cá nhân trực tiếp vận hành và quản lý nền tảng này.
- **Dữ liệu cá nhân**: Thông tin có thể nhận diện bạn, bao gồm họ tên, địa chỉ email, số điện thoại và CV.`,
      },
      {
        title: "3. Điều kiện sử dụng",
        body: `Khi sử dụng nền tảng, bạn đồng ý:

- Cung cấp thông tin ứng tuyển chính xác, trung thực và đầy đủ.
- Không sử dụng nền tảng cho hành vi gian lận, lừa dối hoặc bất kỳ hoạt động nào vi phạm pháp luật Việt Nam.
- Không thu thập thông tin của người dùng khác nếu chưa có sự đồng ý.
- Không đăng tải nội dung xúc phạm, phân biệt đối xử hoặc xâm phạm quyền sở hữu trí tuệ.
- Không cố ý gây hư hại, gián đoạn hoặc truy cập trái phép vào hệ thống.

Chúng tôi có quyền từ chối, tạm ngưng hoặc gỡ bỏ tài khoản hay hồ sơ vi phạm các Điều khoản này mà không cần thông báo trước.`,
      },
      {
        title: "4. Quyền và trách nhiệm của ứng viên",
        body: `**Quyền của ứng viên:**
- Tìm kiếm, xem và ứng tuyển vào các vị trí đang được đăng công khai trên nền tảng.
- Yêu cầu chỉnh sửa hoặc xóa dữ liệu cá nhân theo Chính sách quyền riêng tư.
- Nhận phản hồi từ TA trong một khoảng thời gian hợp lý sau khi nộp hồ sơ.

**Trách nhiệm của ứng viên:**
- Chịu trách nhiệm về tính chính xác của thông tin và CV do mình cung cấp.
- Tôn trọng lịch phỏng vấn đã xác nhận và thông báo trước ít nhất 24 giờ nếu cần hủy.
- Giữ bí mật các thông tin của nhà tuyển dụng mà bạn nhận được trong quá trình tuyển dụng.`,
      },
      {
        title: "5. Quyền và trách nhiệm của nhà tuyển dụng",
        body: `**Quyền của nhà tuyển dụng:**
- Đăng tin tuyển dụng hợp pháp và truy cập các hồ sơ ứng viên có liên quan.
- Yêu cầu Tư vấn tuyển dụng hỗ trợ sàng lọc, tư vấn và kết nối ứng viên.

**Trách nhiệm của nhà tuyển dụng:**
- Đăng tải thông tin tuyển dụng trung thực, rõ ràng và không gây hiểu nhầm.
- Chỉ sử dụng thông tin ứng viên cho mục đích tuyển dụng đã thỏa thuận.
- Trao đổi với ứng viên một cách chuyên nghiệp và tôn trọng, bất kể kết quả tuyển dụng.
- Tuân thủ pháp luật lao động Việt Nam trong mọi quyết định tuyển dụng.`,
      },
      {
        title: "6. Giới hạn trách nhiệm",
        body: `Nền tảng đóng vai trò là điểm kết nối giữa ứng viên và nhà tuyển dụng. Chúng tôi không bảo đảm rằng:
- Ứng viên sẽ nhận được lời mời làm việc sau khi ứng tuyển.
- Nhà tuyển dụng sẽ tìm được ứng viên phù hợp trong một khoảng thời gian cụ thể.
- Mọi thông tin do bất kỳ bên nào cung cấp đều hoàn toàn chính xác.

Chúng tôi không chịu trách nhiệm đối với các tổn thất phát sinh từ quyết định tuyển dụng, nội dung không chính xác do người dùng cung cấp hoặc các gián đoạn dịch vụ nằm ngoài khả năng kiểm soát hợp lý của chúng tôi.`,
      },
      {
        title: "7. Sở hữu trí tuệ",
        body: `Toàn bộ nội dung trên nền tảng, bao gồm thiết kế giao diện, logo, văn bản và hình ảnh, thuộc sở hữu của Lường Bích TA Consultant, trừ khi có ghi chú khác.

Bạn không được sao chép, phân phối, chỉnh sửa hoặc sử dụng cho mục đích thương mại bất kỳ nội dung nào nếu chưa có sự đồng ý bằng văn bản của chúng tôi.`,
      },
      {
        title: "8. Thay đổi đối với Điều khoản",
        body: `Chúng tôi có thể cập nhật Điều khoản sử dụng này vào bất kỳ thời điểm nào. Các thay đổi có hiệu lực ngay khi được đăng tải trên nền tảng. Việc bạn tiếp tục sử dụng dịch vụ sau khi thay đổi được công bố đồng nghĩa với việc bạn chấp nhận bản Điều khoản đã cập nhật.

Ngày cập nhật: **10 tháng 7, 2026**.`,
      },
      {
        title: "9. Luật áp dụng và giải quyết tranh chấp",
        body: "Các Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Mọi tranh chấp trước tiên sẽ được giải quyết thông qua thương lượng thiện chí. Nếu không đạt được thỏa thuận, tranh chấp sẽ được đưa ra Tòa án nhân dân có thẩm quyền tại Hà Nội, Việt Nam.",
      },
      {
        title: "10. Liên hệ",
        body: `Nếu bạn có câu hỏi về Điều khoản sử dụng này, vui lòng liên hệ:

**Lường Bích — Tư vấn tuyển dụng**
Email: ${contactConfig.email}
Zalo/Số điện thoại: Vui lòng liên hệ qua biểu mẫu trên website`,
      },
    ],
  },
  en: {
    badge: "Legal",
    title: "Terms of Use",
    updatedLabel: "Last updated:",
    updatedDate: "July 10, 2026",
    updatedNote: "Effective when you use the platform.",
    contentsLabel: "Contents",
    acknowledgement: "By using the platform, you confirm that you have read and agree to these Terms of Use.",
    primaryCta: "View jobs",
    secondaryCta: "Privacy Policy",
    sections: [
      {
        title: "1. Introduction",
        body: `Welcome to the recruiting platform operated by **Lường Bích — TA Consultant** ("we", "us", "our", or "the platform"). By accessing or using this website, you agree to comply with the terms and conditions below.

Please read these Terms carefully before using the service. If you do not agree with any part of these Terms, please stop using the platform immediately.`,
      },
      {
        title: "2. Definitions",
        body: `- **Platform**: The recruiting website on this domain, including all related pages and features.
- **Candidate**: An individual who uses the platform to search for job opportunities and submit applications.
- **Employer**: A company or organization that publishes job openings through the platform.
- **TA Consultant**: Lường Bích, the individual operating and managing this platform.
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
- Receive a response from TA within a reasonable period after submitting an application.

**Candidate responsibilities:**
- Be responsible for the accuracy of the information and CV you provide.
- Respect confirmed interview schedules and give at least 24 hours' notice if you need to cancel.
- Keep employer information received during the recruitment process confidential.`,
      },
      {
        title: "5. Employer Rights and Responsibilities",
        body: `**Employer rights:**
- Publish lawful job openings and access relevant candidate profiles.
- Request support from the TA Consultant for screening, advisory, and candidate connection activities.

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
        body: `All content on the platform, including interface design, logos, text, and images, belongs to Lường Bích TA Consultant unless otherwise stated.

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

**Lường Bích — TA Consultant**
Email: ${contactConfig.email}
Zalo/Phone: Please contact us through the website form`,
      },
    ],
  },
};

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
  const { language, t } = useLanguage();
  const content = CONTENT[language];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <PublicLayout>
      <div className="border-b border-border bg-gradient-to-br from-pink-50 to-background py-7">
        <div className="max-w-3xl mx-auto px-6">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ChevronLeft size={15} /> {t("common.home")}
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{content.badge}</p>
              <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {content.title}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {content.updatedLabel} <strong className="text-foreground">{content.updatedDate}</strong> · {content.updatedNote}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-8">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">{content.contentsLabel}</p>
          <ol className="space-y-1.5">
            {content.sections.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-8">
          {content.sections.map((section, index) => (
            <div key={section.title} id={`section-${index}`} className="scroll-mt-20">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {section.title}
              </h2>
              <div className="space-y-2">{renderBody(section.body)}</div>
              {index < content.sections.length - 1 && <div className="mt-8 border-b border-border" />}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white border border-border rounded-2xl text-center">
          <p className="text-sm text-muted-foreground mb-4">{content.acknowledgement}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/jobs" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
              {content.primaryCta}
            </Link>
            <Link to="/privacy" className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
