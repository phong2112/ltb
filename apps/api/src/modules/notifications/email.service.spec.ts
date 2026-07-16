import type { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { EmailService } from "./email.service";

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe("EmailService", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("does not call Gmail SMTP when email settings are incomplete", async () => {
    const service = new EmailService(createConfigService({ EMAIL_PROVIDER: "gmail" }));

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it("sends an application confirmation email through Gmail SMTP", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "gmail-message-1" });
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const service = new EmailService(
      createConfigService({
        EMAIL_PROVIDER: "gmail",
        EMAIL_FROM: "Lường Thị Bích <xuanphongpham2112@gmail.com>",
        EMAIL_REPLY_TO: "xuanphongpham2112@gmail.com",
        EMAIL_SMTP_USER: "xuanphongpham2112@gmail.com",
        EMAIL_SMTP_PASS: "google-app-password",
        ADMIN_NAME: "Lường Thị Bích",
        WEB_ORIGIN: "https://careers.example.com",
      }),
    );

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
      companyName: "Acme Vietnam",
      jobSlug: "frontend-engineer",
      applicationArea: "Hà Nội",
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "xuanphongpham2112@gmail.com",
        pass: "google-app-password",
      },
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Lường Thị Bích <xuanphongpham2112@gmail.com>",
      to: "candidate@example.com",
      replyTo: "xuanphongpham2112@gmail.com",
      subject: "Hồ sơ ứng tuyển Frontend Engineer đã được ghi nhận",
      html: expect.stringContaining("3-5 ngày làm việc"),
      text: expect.stringContaining("Khu vực ứng tuyển: Hà Nội"),
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining("lưu lại thông tin của bạn"),
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining("https://careers.example.com/jobs/frontend-engineer"),
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining("https://careers.example.com/images/bich-candy-logo.jpg"),
    }));
  });

  it("defaults to Gmail SMTP when EMAIL_PROVIDER is not set", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "gmail-message-1" });
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const service = new EmailService(
      createConfigService({
        EMAIL_FROM: "Lường Thị Bích <xuanphongpham2112@gmail.com>",
        EMAIL_SMTP_USER: "xuanphongpham2112@gmail.com",
        EMAIL_SMTP_PASS: "google-app-password",
      }),
    );

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("does not send when EMAIL_PROVIDER is unsupported", async () => {
    const service = new EmailService(createConfigService({ EMAIL_PROVIDER: "mailgun" }));

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});

function createConfigService(values: Record<string, string>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
