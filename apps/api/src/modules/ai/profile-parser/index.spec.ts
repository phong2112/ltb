import { parseCvProfileFromText } from ".";

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

    expect(profile.fullName).toBe("Nguyễn Văn A");
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
    expect(profile.linkedinUrl).toBe("https://www.linkedin.com/in/someone");
    expect(profile.portfolioUrl).toBeUndefined();
  });

  it("extracts linkedin urls without a protocol", () => {
    const profile = parseCvProfileFromText("LinkedIn: linkedin.com/in/pham-quang-minh");

    expect(profile.linkedinUrl).toBe("https://www.linkedin.com/in/pham-quang-minh");
  });

  it("extracts linkedin urls from OCR text with inserted spaces", () => {
    const profile = parseCvProfileFromText("Linked In: www. linkedin. com / in / pham-quang-minh");

    expect(profile.linkedinUrl).toBe("https://www.linkedin.com/in/pham-quang-minh");
  });

  it("extracts linkedin urls when OCR wraps a hyphenated slug", () => {
    const profile = parseCvProfileFromText("LinkedIn: https://www.linkedin.com/in/pham-quang-\nminh");

    expect(profile.linkedinUrl).toBe("https://www.linkedin.com/in/pham-quang-minh");
  });

  it("lowercases the email and strips trailing punctuation from urls", () => {
    const profile = parseCvProfileFromText("Mail A.Nguyen@GMAIL.com; site https://foo.dev/work.");
    expect(profile.email).toBe("a.nguyen@gmail.com");
    expect(profile.portfolioUrl).toBe("https://foo.dev/work");
  });

  it("returns an empty profile when nothing matches", () => {
    expect(parseCvProfileFromText("Không có thông tin liên hệ.")).toEqual({});
  });

  it("does not treat CV headings or job titles as the candidate name", () => {
    const profile = parseCvProfileFromText([
      "Curriculum Vitae",
      "Senior QA Automation Engineer",
      "LƯU THỊ PHƯƠNG",
      "Email: phuong@example.com",
    ].join("\n"));

    expect(profile.fullName).toBe("Lưu Thị Phương");
  });

  it("extracts names from common header formats with nicknames or titles", () => {
    expect(parseCvProfileFromText("Luong Huu Nhan (Johnny)\nJava Developer").fullName)
      .toBe("Luong Huu Nhan");
    expect(parseCvProfileFromText("THU LE - iOS Developer\nHo Chi Minh").fullName)
      .toBe("Thu Le");
  });

  it("extracts title and skills from a QA lead CV header and summary", () => {
    const profile = parseCvProfileFromText([
      "SENIOR QA / QA LEAD PROFILE",
      "HUE DO THI (SANDY)",
      "SENIOR QA ENGINEER | QA LEAD",
      "Certified Tester AI Testing | ISTQB Advanced Level - Test Manager | ISTQB Agile Tester",
      "Senior QA Engineer with 10+ years of functional, regression, performance, security, and automation testing.",
      "Experienced in validating AI-related features such as prediction flows, model behavior, LLM-based workflows, and chatbot responses.",
    ].join("\n"));

    expect(profile.fullName).toBe("Hue Do Thi");
    expect(profile.title).toBe("SENIOR QA ENGINEER | QA LEAD");
    expect(profile.skills).toEqual(expect.arrayContaining([
      "QA",
      "QA Lead",
      "Automation Testing",
      "AI Testing",
      "LLM",
      "ISTQB",
      "Agile",
    ]));
  });

  it("extracts a title from application header lines with a role prefix", () => {
    const profile = parseCvProfileFromText([
      "Application for:",
      "Senior Backend Engineer (Java / Golang)",
      "25 Jun, 2026",
      "VŨ THÀNH TÂM",
      "Email: tam@example.com",
    ].join("\n"));

    expect(profile.fullName).toBe("Vũ Thành Tâm");
    expect(profile.title).toBe("Senior Backend Engineer (Java / Golang)");
  });

  it("extracts a title from summary and current experience lines", () => {
    expect(parseCvProfileFromText([
      "Luong Huu Nhan (Johnny)",
      "Java Developer with strong experience in Java, Spring Boot, Microservices, and Cloud (AWS).",
      "WORK EXPERIENCE",
    ].join("\n")).title).toBe("Java Developer");

    expect(parseCvProfileFromText([
      "Quan Nguyen",
      "WORK EXPERIENCE",
      "Salesforce Developer Aug 2025 - Present",
      "MOR Software Hanoi",
    ].join("\n")).title).toBe("Salesforce Developer");
  });

  it("keeps QA generic skill focused to avoid team-collaboration false positives", () => {
    const profile = parseCvProfileFromText([
      "Luong Huu Nhan (Johnny)",
      "Java Developer with strong experience in Java, Spring Boot, Microservices, and Cloud (AWS).",
      "Collaborated with Frontend, QA, and DevOps teams to deliver projects on schedule.",
      "SKILLS",
      "Programming: Java, Spring Boot, AWS, Database (PostgreSQL, MySQL, MongoDB), Angular, Nextjs.",
      "CI/CD & DevOps: Jenkins, GitLab CI, Docker, Kubernetes.",
    ].join("\n"));

    expect(profile.skills).toEqual(expect.arrayContaining([
      "Java",
      "Spring Boot",
      "AWS",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Angular",
      "Next.js",
      "Docker",
      "Kubernetes",
      "CI/CD",
    ]));
    expect(profile.skills).not.toContain("QA");
  });
});
