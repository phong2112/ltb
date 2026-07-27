import type { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { EmailService } from "./email.service";

jest.mock("google-auth-library", () => {
  const setCredentials = jest.fn();
  const getAccessToken = jest.fn().mockResolvedValue({ token: "access-token-1" });
  return {
    __esModule: true,
    OAuth2Client: jest.fn().mockImplementation(() => ({
      setCredentials,
      getAccessToken,
    })),
  };
});

const GMAIL_SEND_ENDPOINT =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

describe("EmailService", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: jest.fn().mockResolvedValue(""),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("does not call the Gmail API when email settings are incomplete", async () => {
    const service = new EmailService(createConfigService({ EMAIL_PROVIDER: "gmail" }));

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(OAuth2Client).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an application confirmation email through the Gmail API", async () => {
    const service = new EmailService(
      createConfigService({
        EMAIL_PROVIDER: "gmail",
        EMAIL_FROM: "Lường Bích <xuanphongpham2112@gmail.com>",
        EMAIL_REPLY_TO: "xuanphongpham2112@gmail.com",
        GMAIL_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GMAIL_CLIENT_SECRET: "client-secret",
        GMAIL_REFRESH_TOKEN: "refresh-token",
        ADMIN_NAME: "Lường Bích",
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

    expect(OAuth2Client).toHaveBeenCalledWith(
      "client-id.apps.googleusercontent.com",
      "client-secret",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(GMAIL_SEND_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer access-token-1");

    const rawMime = decodeRawMime(JSON.parse(init.body).raw);
    expect(rawMime).toContain("To: candidate@example.com");
    expect(rawMime).toContain("Reply-To: xuanphongpham2112@gmail.com");
    expect(rawMime).toContain("3-5 ngày làm việc");
    expect(rawMime).toContain("Khu vực ứng tuyển: Hà Nội");
    expect(rawMime).toContain("lưu lại thông tin của bạn");
    expect(rawMime).toContain("https://careers.example.com/jobs/frontend-engineer");
    expect(rawMime).toContain("https://careers.example.com/images/bich-candy-logo.jpg");
  });

  it("defaults to the Gmail API when EMAIL_PROVIDER is not set", async () => {
    const service = new EmailService(
      createConfigService({
        EMAIL_FROM: "Lường Bích <xuanphongpham2112@gmail.com>",
        GMAIL_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GMAIL_CLIENT_SECRET: "client-secret",
        GMAIL_REFRESH_TOKEN: "refresh-token",
      }),
    );

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send when EMAIL_PROVIDER is unsupported", async () => {
    const service = new EmailService(createConfigService({ EMAIL_PROVIDER: "mailgun" }));

    await service.sendApplicationConfirmation({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
    });

    expect(OAuth2Client).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when the Gmail API responds with an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: jest.fn().mockResolvedValue("invalid_grant"),
    });
    const service = new EmailService(
      createConfigService({
        EMAIL_PROVIDER: "gmail",
        EMAIL_FROM: "Lường Bích <xuanphongpham2112@gmail.com>",
        GMAIL_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GMAIL_CLIENT_SECRET: "client-secret",
        GMAIL_REFRESH_TOKEN: "refresh-token",
      }),
    );

    await expect(
      service.sendApplicationConfirmation({
        applicationId: "application-1",
        candidateEmail: "candidate@example.com",
        candidateName: "Candidate",
        jobTitle: "Frontend Engineer",
      }),
    ).rejects.toThrow("Gmail API send failed (401 Unauthorized): invalid_grant");
  });
});

function decodeRawMime(raw: string) {
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  return decodeQuotedPrintable(mime);
}

// Decode quoted-printable bodies so assertions can match readable UTF-8 text:
// drop soft line breaks, then turn "=XX" hex escapes back into raw bytes.
function decodeQuotedPrintable(input: string) {
  const withoutSoftBreaks = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < withoutSoftBreaks.length; i += 1) {
    const char = withoutSoftBreaks[i];
    const hex = withoutSoftBreaks.slice(i + 1, i + 3);
    if (char === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(withoutSoftBreaks.charCodeAt(i));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function createConfigService(values: Record<string, string>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
