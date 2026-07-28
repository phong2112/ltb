import { parseCvProfileFromText } from "./parse-cv-profile";

describe("parseCvProfileFromText", () => {
  it("extracts email, phone, linkedin and portfolio from a typical CV", () => {
    const text = [
      "Nguyễn Văn A",
      "Email: a.nguyen@gmail.com",
      "Điện thoại: 0901 234 567",
      "LinkedIn: https://www.linkedin.com/in/anguyen",
      "Portfolio: https://anguyen.dev",
    ].join("\n");

    const profile = parseCvProfileFromText(text);

    expect(profile.email).toBe("a.nguyen@gmail.com");
    expect(profile.phone).toContain("0901");
    expect(profile.normalizedPhone).toBe("0901234567");
    expect(profile.linkedinUrl).toBe("https://www.linkedin.com/in/anguyen");
    expect(profile.portfolioUrl).toBe("https://anguyen.dev");
  });

  it("normalizes a +84 phone number to the local form", () => {
    const profile = parseCvProfileFromText("Contact: +84 912 345 678");
    expect(profile.normalizedPhone).toBe("0912345678");
  });

  it("does not treat the linkedin url as the portfolio", () => {
    const profile = parseCvProfileFromText("https://linkedin.com/in/someone only");
    expect(profile.linkedinUrl).toBe("https://linkedin.com/in/someone");
    expect(profile.portfolioUrl).toBeUndefined();
  });

  it("lowercases the email and strips trailing punctuation from urls", () => {
    const profile = parseCvProfileFromText("Mail A.Nguyen@GMAIL.com; site https://foo.dev/work.");
    expect(profile.email).toBe("a.nguyen@gmail.com");
    expect(profile.portfolioUrl).toBe("https://foo.dev/work");
  });

  it("returns an empty profile when nothing matches", () => {
    expect(parseCvProfileFromText("Không có thông tin liên hệ.")).toEqual({});
  });
});
