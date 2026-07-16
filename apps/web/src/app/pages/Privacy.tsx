import { type ReactNode, useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, Database, Eye, Mail, Shield, Trash2, UserCheck } from "lucide-react";
import { contactConfig } from "@/app/contact-config";
import { type Language, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

type HighlightKey = "minimization" | "transparency" | "control" | "deletion";

type Highlight = {
  key: HighlightKey;
  title: string;
  desc: string;
};

type LegalSection = {
  title: string;
  body: string;
};

type PrivacyPageContent = {
  badge: string;
  title: string;
  updatedLabel: string;
  updatedDate: string;
  updatedNote: string;
  contentsLabel: string;
  contactTitle: string;
  contactBody: string;
  contactCta: string;
  secondaryCta: string;
  highlights: Highlight[];
  sections: LegalSection[];
};

const HIGHLIGHT_ICONS: Record<HighlightKey, ReactNode> = {
  minimization: <Database size={16} />,
  transparency: <Eye size={16} />,
  control: <UserCheck size={16} />,
  deletion: <Trash2 size={16} />,
};

const CONTENT: Record<Language, PrivacyPageContent> = {
  vi: {
    badge: "Pháp lý",
    title: "Chính sách quyền riêng tư",
    updatedLabel: "Ngày cập nhật:",
    updatedDate: "10 tháng 7, 2026",
    updatedNote: "Chúng tôi tôn trọng quyền riêng tư của bạn.",
    contentsLabel: "Mục lục",
    contactTitle: "Có câu hỏi về quyền riêng tư?",
    contactBody: "Chúng tôi cố gắng phản hồi trong vòng 7 ngày làm việc.",
    contactCta: "Gửi email",
    secondaryCta: "Điều khoản sử dụng",
    highlights: [
      { key: "minimization", title: "Thu thập tối thiểu", desc: "Chúng tôi chỉ thu thập những thông tin cần thiết cho mục đích tuyển dụng." },
      { key: "transparency", title: "Minh bạch", desc: "Bạn biết dữ liệu nào được thu thập và chúng được sử dụng ra sao." },
      { key: "control", title: "Quyền kiểm soát của bạn", desc: "Bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân của mình." },
      { key: "deletion", title: "Xóa khi không còn cần thiết", desc: "Dữ liệu sẽ được xóa sau 24 tháng kể từ lần tương tác gần nhất." },
    ],
    sections: [
      {
        title: "1. Chúng tôi thu thập những thông tin gì?",
        body: `Khi bạn sử dụng nền tảng, chúng tôi có thể thu thập các nhóm thông tin sau:

**1.1 Thông tin bạn cung cấp trực tiếp:**
- Họ và tên
- Địa chỉ email
- Số điện thoại
- CV, portfolio hoặc liên kết hồ sơ cá nhân
- Thư giới thiệu và câu trả lời sàng lọc
- Ghi chú hoặc tin nhắn bạn gửi cho chúng tôi

**1.2 Thông tin được thu thập tự động:**
- Địa chỉ IP và thông tin trình duyệt, chỉ dùng cho mục đích bảo mật
- Các trang đã truy cập và thời gian truy cập, ở dạng tổng hợp và đã ẩn danh
- Loại thiết bị, chẳng hạn máy tính hoặc điện thoại

**1.3 Thông tin chúng tôi KHÔNG thu thập:**
- Thông tin tài chính hoặc thẻ thanh toán
- Dữ liệu sinh trắc học
- Những thông tin không cần thiết cho mục đích tuyển dụng`,
      },
      {
        title: "2. Vì sao chúng tôi thu thập thông tin?",
        body: `Dữ liệu của bạn được sử dụng cho các mục đích sau:

- **Xử lý hồ sơ ứng tuyển**: Chia sẻ thông tin với nhà tuyển dụng liên quan và sắp xếp lịch phỏng vấn.
- **Liên lạc**: Gửi cập nhật về trạng thái ứng tuyển, thông báo phỏng vấn và phản hồi từ TA.
- **Cải thiện dịch vụ**: Phân tích dữ liệu đã ẩn danh để cải thiện trải nghiệm người dùng.
- **Tuân thủ pháp luật**: Lưu giữ hồ sơ khi pháp luật yêu cầu.
- **Nguồn ứng viên tiềm năng**: Với sự đồng ý của bạn, lưu thông tin để kết nối với các cơ hội trong tương lai.

Chúng tôi **không** bán, cho thuê hoặc chia sẻ dữ liệu của bạn cho bên thứ ba vì mục đích thương mại.`,
      },
      {
        title: "3. Ai có thể truy cập thông tin của bạn?",
        body: `**Nhà tuyển dụng liên quan:**
Khi bạn ứng tuyển vào một vị trí, thông tin ứng tuyển của bạn, bao gồm họ tên, email, CV và thư giới thiệu, chỉ được chia sẻ với nhà tuyển dụng của vị trí đó. Nhà tuyển dụng có trách nhiệm bảo mật thông tin theo Điều khoản sử dụng của chúng tôi.

**Tư vấn tuyển dụng:**
Lường Bích và các trợ lý trực tiếp, nếu có, có thể truy cập hồ sơ ứng tuyển để hỗ trợ quá trình tuyển dụng.

**Đơn vị cung cấp dịch vụ kỹ thuật:**
Các đơn vị hạ tầng như dịch vụ lưu trữ hoặc email có thể xử lý dữ liệu theo nghĩa vụ bảo mật. Họ không được phép sử dụng dữ liệu của bạn cho mục đích riêng.

**Cơ quan có thẩm quyền:**
Chỉ trong trường hợp có yêu cầu bắt buộc theo quyết định của tòa án hoặc nghĩa vụ pháp lý.`,
      },
      {
        title: "4. Chúng tôi lưu giữ dữ liệu trong bao lâu?",
        body: `- **Hồ sơ bị từ chối**: Xóa sau **12 tháng** kể từ ngày ra quyết định, trừ khi bạn đồng ý tham gia nguồn ứng viên tiềm năng.
- **Hồ sơ trong nguồn ứng viên tiềm năng**: Lưu tối đa **24 tháng** kể từ lần tương tác gần nhất. Bạn có thể yêu cầu xóa sớm hơn bất kỳ lúc nào.
- **Hồ sơ ứng viên đã được tuyển dụng**: Lưu giữ theo yêu cầu của pháp luật về hồ sơ lao động, tối đa 5 năm.
- **Nhật ký kỹ thuật**: Tự động xóa sau 90 ngày.

Sau các mốc thời gian này, dữ liệu sẽ được xóa vĩnh viễn hoặc ẩn danh hoàn toàn.`,
      },
      {
        title: "5. Quyền của bạn đối với dữ liệu cá nhân",
        body: `Theo pháp luật Việt Nam và các chuẩn mực bảo vệ dữ liệu được thừa nhận rộng rãi, bạn có các quyền sau:

**Quyền truy cập:**
Yêu cầu một bản sao dữ liệu cá nhân mà chúng tôi đang lưu giữ về bạn.

**Quyền chỉnh sửa:**
Yêu cầu chỉnh sửa thông tin không chính xác hoặc chưa đầy đủ.

**Quyền xóa dữ liệu:**
Yêu cầu xóa dữ liệu cá nhân của bạn, trừ trường hợp chúng tôi phải lưu giữ theo quy định pháp luật.

**Quyền phản đối:**
Phản đối việc xử lý dữ liệu cho các mục đích cụ thể, chẳng hạn như tiếp thị.

**Quyền rút lại sự đồng ý:**
Rút lại sự đồng ý vào bất kỳ lúc nào mà không ảnh hưởng đến tính hợp pháp của việc xử lý trước đó.

Để thực hiện các quyền này, vui lòng gửi yêu cầu đến **${contactConfig.email}**. Chúng tôi sẽ phản hồi trong vòng **7 ngày làm việc**.`,
      },
      {
        title: "6. Bảo mật dữ liệu",
        body: `Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu của bạn:

- **Mã hóa HTTPS** cho toàn bộ kết nối tới nền tảng.
- **Kiểm soát truy cập chặt chẽ** để chỉ nhân sự được ủy quyền mới có thể truy cập dữ liệu ứng viên.
- **Không lưu mật khẩu ở dạng thuần văn bản**; mật khẩu được băm bằng thuật toán an toàn.
- **Sao lưu định kỳ** để giảm nguy cơ mất dữ liệu do sự cố kỹ thuật.

Tuy vậy, không có hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố bảo mật ảnh hưởng đến dữ liệu của bạn, chúng tôi sẽ thông báo trong vòng 72 giờ khi pháp luật yêu cầu.`,
      },
      {
        title: "7. Cookie và công nghệ theo dõi",
        body: "Nền tảng sử dụng các cookie cần thiết để hoạt động đúng cách, chẳng hạn như duy trì phiên đăng nhập. Chúng tôi **không** sử dụng cookie theo dõi quảng cáo và không chia sẻ hành vi duyệt web của bạn cho bên thứ ba.\n\nBạn có thể tắt cookie trong cài đặt trình duyệt, nhưng một số tính năng có thể không hoạt động chính xác.",
      },
      {
        title: "8. Trẻ em và người dùng dưới 18 tuổi",
        body: "Nền tảng không dành cho người dùng dưới 18 tuổi và chúng tôi không cố ý thu thập dữ liệu cá nhân của trẻ em. Nếu bạn cho rằng một người dưới 18 tuổi đã cung cấp dữ liệu cá nhân, vui lòng liên hệ để chúng tôi xóa kịp thời.",
      },
      {
        title: "9. Thay đổi đối với chính sách này",
        body: `Chúng tôi có thể cập nhật Chính sách quyền riêng tư này theo thời gian để phản ánh thay đổi trong hoạt động hoặc yêu cầu pháp lý. Nếu có thay đổi quan trọng, chúng tôi sẽ thông báo qua email nếu bạn đã cung cấp, hoặc hiển thị thông báo nổi bật trên nền tảng.

Ngày cập nhật: **10 tháng 7, 2026**.`,
      },
      {
        title: "10. Liên hệ về quyền riêng tư",
        body: `Nếu bạn có câu hỏi, lo ngại hoặc muốn thực hiện các quyền của mình:

**Lường Bích — Tư vấn tuyển dụng**
Email: ${contactConfig.email}
Thời gian phản hồi: Trong vòng 7 ngày làm việc

Bạn cũng có thể gửi khiếu nại tới cơ quan có thẩm quyền về bảo vệ dữ liệu tại Việt Nam nếu cho rằng quyền của mình đã bị xâm phạm.`,
      },
    ],
  },
  en: {
    badge: "Legal",
    title: "Privacy Policy",
    updatedLabel: "Last updated:",
    updatedDate: "July 10, 2026",
    updatedNote: "We value your privacy.",
    contentsLabel: "Contents",
    contactTitle: "Questions about privacy?",
    contactBody: "We aim to respond within 7 business days.",
    contactCta: "Send email",
    secondaryCta: "Terms of Use",
    highlights: [
      { key: "minimization", title: "Data minimization", desc: "We collect only the information needed for recruitment." },
      { key: "transparency", title: "Transparency", desc: "You know what data is collected and how it is used." },
      { key: "control", title: "Your control", desc: "You may request access, correction, or deletion of your data." },
      { key: "deletion", title: "Deletion when no longer needed", desc: "Data is deleted after 24 months from the last interaction." },
    ],
    sections: [
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
- **Communication**: Provide application status updates, interview notices, and TA feedback.
- **Service improvement**: Analyze anonymized data to improve the user experience.
- **Legal compliance**: Retain records where legally required.
- **Talent pool**: With your consent, keep your information to connect you with future opportunities.

We **do not** sell, rent, or share your data with third parties for commercial purposes.`,
      },
      {
        title: "3. Who can access your information?",
        body: `**Relevant employers:**
When you apply for a role, your application information, including name, email, CV, and cover note, is shared with the employer for that role only. Employers are expected to keep information confidential under our Terms of Use.

**TA Consultant:**
Lường Bích and direct assistants, if any, may access application profiles to support the recruitment process.

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
        body: `Under Vietnamese law and internationally recognized data protection standards, you have the following rights:

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

**Lường Bích — TA Consultant**
Email: ${contactConfig.email}
Response time: Within 7 business days

You may also file a complaint with the competent data protection authority in Vietnam if you believe your rights have been violated.`,
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

export default function Privacy() {
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
              <Shield size={20} />
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
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {content.highlights.map((highlight) => (
            <div key={highlight.key} className="flex items-start gap-3 p-4 bg-white border border-border rounded-2xl hover:border-primary/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{HIGHLIGHT_ICONS[highlight.key]}</div>
              <div>
                <p className="text-sm font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{highlight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{highlight.desc}</p>
              </div>
            </div>
          ))}
        </div>

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

        <div className="mt-12 p-6 bg-white border border-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Mail size={20} />
          </div>
          <div className="flex-1">
            <p className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{content.contactTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{content.contactBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${contactConfig.email}`} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
              {content.contactCta}
            </a>
            <Link to="/terms" className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
