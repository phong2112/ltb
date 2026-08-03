import { calculateTextQuality, cleanExtractedCvText, prepareCvMatchInputForAi, prepareCvTextForAi } from ".";

describe("CV text cleaner", () => {
  it("normalizes invisible characters and repairs hyphenated line breaks", () => {
    expect(cleanExtractedCvText("Full-\nstack\u200b  Engineer\r\n\r\nReact")).toBe(
      "Fullstack Engineer\n\nReact",
    );
  });

  it("redacts unnecessary contact data before AI without redacting year ranges", () => {
    const result = prepareCvTextForAi(
      "Nguyễn Văn A\nEmail: candidate@example.com\nPhone: 0901 234 567\n2018 - 2024\nhttps://linkedin.com/in/candidate",
      10_000,
      ["Nguyễn Văn A"],
    );

    expect(result.text).not.toContain("Nguyễn Văn A");
    expect(result.text).not.toContain("candidate@example.com");
    expect(result.text).not.toContain("0901 234 567");
    expect(result.text).not.toContain("linkedin.com");
    expect(result.text).toContain("2018 - 2024");
    expect(result.redactionCount).toBe(4);
  });

  it("keeps both the beginning and end when bounding a long AI payload", () => {
    const result = prepareCvTextForAi(`BEGINNING\n${"x".repeat(200)}\nENDING`, 100);

    expect(result.truncated).toBe(true);
    expect(result.strategy).toBe("full_cleaned_text");
    expect(result.text).toContain("BEGINNING");
    expect(result.text).toContain("ENDING");
    expect(result.text.length).toBeLessThanOrEqual(100);
  });

  it("builds a criteria-curated matching payload and removes repeated OCR noise", () => {
    const cv = `
      Nguyen Van A
      Email: candidate@example.com
      Page 1/3
      --------
      Professional Summary
      Frontend engineer building SaaS products.
      Skills
      React, TypeScript, Node.js, PostgreSQL
      Work Experience
      Built React dashboards with TypeScript and optimized frontend performance.
      Created Node.js REST APIs and integrated PostgreSQL reporting.
      Education
      Computer Science degree.
      Page 1/3
      Page 1/3
      Page 1/3
      Page 1/3
    `;
    const result = prepareCvMatchInputForAi(cv, 4_000, [
      { id: "criterion-1", text: "Strong React and TypeScript experience", importance: "required", constraintType: "hard_skill", required: true, blocker: false, weight: 2 },
      { id: "criterion-2", text: "Node.js REST API experience", importance: "required", constraintType: "hard_skill", required: true, blocker: false, weight: 2 },
      { id: "criterion-3", text: "AWS experience", importance: "preferred", constraintType: "hard_skill", required: false, blocker: false, weight: 1 },
    ], ["Nguyen Van A"]);

    expect(result.strategy).toBe("criteria_curated_pack");
    expect(result.text).toContain("[BANG_CHUNG_THEO_TIEU_CHI]");
    expect(result.text).toContain("Built React dashboards with TypeScript");
    expect(result.text).toContain("Created Node.js REST APIs");
    expect(result.text).toContain("Không tìm thấy đoạn CV liên quan rõ ràng");
    expect(result.text).not.toContain("candidate@example.com");
    expect(result.text).not.toContain("Nguyen Van A");
    expect(result.text).not.toContain("Page 1/3");
    expect(result.criterionSnippetCount).toBeGreaterThanOrEqual(2);
    expect(result.sections).toEqual(expect.arrayContaining(["summary", "skills", "experience", "education"]));
  });

  it("scores readable text above replacement-character noise", () => {
    expect(calculateTextQuality("React TypeScript Node.js kinh nghiệm dự án")).toBeGreaterThan(
      calculateTextQuality("\uFFFD\uFFFD\uFFFD\uFFFD 12"),
    );
  });
});
