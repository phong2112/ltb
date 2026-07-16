import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

type EmailConfig = {
  from: string;
  replyTo?: string;
  brandName: string;
  publicBaseUrl?: string;
  smtpUser: string;
  smtpPass: string;
};

export type ApplicationConfirmationEmail = {
  applicationId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string | null;
  jobSlug?: string | null;
  applicationArea?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private loggedDisabledNotice = false;

  constructor(private readonly configService: ConfigService) {}

  async sendApplicationConfirmation(input: ApplicationConfirmationEmail) {
    const config = this.getEmailConfig();
    if (!config) return;

    const message = buildApplicationConfirmationEmail(input, {
      brandName: config.brandName,
      publicBaseUrl: config.publicBaseUrl,
    });

    await this.sendWithGmail(config, input.candidateEmail, message);
  }

  private getEmailConfig(): EmailConfig | null {
    const provider = this.configService.get<string>("EMAIL_PROVIDER")?.trim() || "gmail";
    const from = this.configService.get<string>("EMAIL_FROM")?.trim();
    const replyTo = this.configService.get<string>("EMAIL_REPLY_TO")?.trim() || this.configService.get<string>("ADMIN_EMAIL")?.trim();
    const publicBaseUrl = getFirstConfiguredUrl(
      this.configService.get<string>("WEB_ORIGIN"),
      this.configService.get<string>("NEXT_PUBLIC_APP_URL"),
    );
    const brandName = this.configService.get<string>("ADMIN_NAME")?.trim() || "Lường Thị Bích";
    const smtpUser = this.configService.get<string>("EMAIL_SMTP_USER")?.trim();
    const smtpPass = this.configService.get<string>("EMAIL_SMTP_PASS")?.trim();

    if (provider !== "gmail") {
      this.logDisabledOnce(`Email confirmation disabled: unsupported EMAIL_PROVIDER "${provider}". Use gmail SMTP.`);
      return null;
    }

    if (!smtpUser || !smtpPass || !from) {
      this.logDisabledOnce("Email confirmation disabled: configure EMAIL_SMTP_USER, EMAIL_SMTP_PASS, and EMAIL_FROM to enable Gmail SMTP");
      return null;
    }

    return {
      from,
      replyTo,
      brandName,
      publicBaseUrl,
      smtpUser,
      smtpPass,
    };
  }

  private async sendWithGmail(config: EmailConfig, to: string, message: ReturnType<typeof buildApplicationConfirmationEmail>) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }

  private logDisabledOnce(message: string) {
    if (this.loggedDisabledNotice) return;
    this.logger.warn(message);
    this.loggedDisabledNotice = true;
  }
}

function buildApplicationConfirmationEmail(input: ApplicationConfirmationEmail, options: { brandName: string; publicBaseUrl?: string }) {
  const companyName = input.companyName?.trim() || "nhà tuyển dụng";
  const jobUrl = options.publicBaseUrl && input.jobSlug ? `${options.publicBaseUrl}/jobs/${encodeURIComponent(input.jobSlug)}` : undefined;
  const logoUrl = options.publicBaseUrl ? `${options.publicBaseUrl}/images/bich-candy-logo.jpg` : undefined;
  const brandName = options.brandName;
  const subject = `Hồ sơ ứng tuyển ${input.jobTitle} đã được ghi nhận`;
  const textLines = [
    `Chào ${input.candidateName},`,
    "",
    `Cảm ơn bạn đã ứng tuyển vị trí ${input.jobTitle} tại ${companyName}. Hệ thống đã ghi nhận hồ sơ của bạn thành công.`,
    input.applicationArea ? `Khu vực ứng tuyển: ${input.applicationArea}` : "",
    jobUrl ? `Xem lại thông tin công việc: ${jobUrl}` : "",
    "",
    "HR sẽ xem xét hồ sơ và liên hệ trong khoảng 3-5 ngày làm việc nếu hồ sơ phù hợp với tiêu chí tuyển dụng.",
    "Nếu sau thời gian này bạn chưa nhận được liên hệ, rất có thể hồ sơ hiện tại chưa phù hợp với vị trí này. Chúng tôi sẽ lưu lại thông tin của bạn để cân nhắc cho các cơ hội phù hợp hơn trong tương lai.",
    "",
    "Trân trọng,",
    `${brandName} HR`,
  ].filter(Boolean);

  const html = `
    <div style="margin:0;padding:0;background:#FDF6F0;font-family:Nunito,Arial,sans-serif;color:#2D1B22;line-height:1.6">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#FDF6F0">
        <tr>
          <td align="center" style="padding:32px 16px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse">
              <tr>
                <td style="padding:0 0 14px">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                    <tr>
                      <td style="width:46px;height:46px;border-radius:999px;overflow:hidden;background:#F7E8ED;border:2px solid rgba(200,91,122,0.24);text-align:center;vertical-align:middle">
                        ${
                          logoUrl
                            ? `<img src="${escapeHtml(logoUrl)}" width="46" height="46" alt="${escapeHtml(brandName)}" style="display:block;width:46px;height:46px;object-fit:cover;border:0">`
                            : `<span style="display:inline-block;color:#C85B7A;font-size:14px;font-weight:800;line-height:46px">LTB</span>`
                        }
                      </td>
                      <td style="padding-left:12px;vertical-align:middle">
                        <div style="font-family:Georgia,'Times New Roman',serif;color:#C85B7A;font-size:19px;font-weight:700;line-height:1.15">${escapeHtml(brandName)}</div>
                        <div style="color:#8C5F70;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase">HR Consultant</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#FFFFFF;border:1px solid rgba(200,91,122,0.15);border-radius:18px;overflow:hidden;box-shadow:0 18px 44px rgba(120,70,86,0.10)">
                  <div style="height:7px;background:#C85B7A"></div>
                  <div style="padding:30px 28px 26px">
                    <div style="display:inline-block;margin-bottom:14px;padding:7px 12px;border-radius:999px;background:#FDF0F4;color:#C85B7A;font-size:12px;font-weight:800">Hồ sơ đã được ghi nhận</div>
                    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;color:#2D1B22;font-size:28px;line-height:1.22">Cảm ơn bạn đã ứng tuyển</h1>
                    <p style="margin:0 0 18px;color:#5E3B49;font-size:15px">Chào <strong>${escapeHtml(input.candidateName)}</strong>, hệ thống đã nhận hồ sơ của bạn cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong> tại <strong>${escapeHtml(companyName)}</strong>.</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:20px 0;background:#FDF6F0;border:1px solid rgba(200,91,122,0.15);border-radius:14px">
                      <tr>
                        <td style="padding:16px 18px">
                          <div style="color:#8C5F70;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">Vị trí ứng tuyển</div>
                          <div style="margin-top:4px;color:#2D1B22;font-size:16px;font-weight:800">${escapeHtml(input.jobTitle)}</div>
                        </td>
                      </tr>
                      ${
                        input.applicationArea
                          ? `<tr><td style="padding:0 18px 16px"><div style="color:#8C5F70;font-size:12px;font-weight:700">Khu vực ứng tuyển: <span style="color:#2D1B22">${escapeHtml(input.applicationArea)}</span></div></td></tr>`
                          : ""
                      }
                    </table>

                    <div style="margin:0 0 18px;padding:16px 18px;border-left:4px solid #C85B7A;background:#FDF0F4;border-radius:12px">
                      <p style="margin:0;color:#2D1B22;font-size:14px;font-weight:800">Bước tiếp theo</p>
                      <p style="margin:6px 0 0;color:#5E3B49;font-size:14px">HR sẽ xem xét hồ sơ và liên hệ với bạn qua email hoặc số điện thoại đã cung cấp trong khoảng <strong>3-5 ngày làm việc</strong> nếu hồ sơ phù hợp với tiêu chí tuyển dụng.</p>
                    </div>

                    <p style="margin:0 0 18px;color:#5E3B49;font-size:14px">Nếu sau thời gian này bạn chưa nhận được liên hệ, rất có thể hồ sơ hiện tại chưa phù hợp với vị trí này. Chúng tôi sẽ lưu lại thông tin của bạn để cân nhắc cho các cơ hội phù hợp hơn trong tương lai.</p>

                    ${
                      jobUrl
                        ? `<a href="${escapeHtml(jobUrl)}" style="display:inline-block;margin-top:2px;padding:12px 18px;border-radius:12px;background:#C85B7A;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none">Xem lại thông tin công việc</a>`
                        : ""
                    }
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 4px 0;color:#8C5F70;font-size:12px;text-align:center">
                  Email này được gửi tự động để xác nhận hồ sơ ứng tuyển của bạn. Vui lòng không gửi CV hoặc thông tin nhạy cảm qua phản hồi tự động.
                  <br>
                  <span style="font-weight:800;color:#C85B7A">${escapeHtml(brandName)} HR</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFirstConfiguredUrl(...values: Array<string | undefined>) {
  for (const value of values) {
    const url = normalizeHttpUrl(value);
    if (url) return url;
  }

  return undefined;
}

function normalizeHttpUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.toString().replace(/\/+$/u, "");
  } catch {
    return undefined;
  }
}
