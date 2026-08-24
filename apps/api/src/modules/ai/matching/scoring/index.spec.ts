import type { CriterionEvaluation } from "@/models/ai";
import { calculateConfidence, calculateMatchScore, extractMatchCriteria } from ".";

describe("AI match scoring", () => {
  it("extracts required and preferred criteria from normalized requirement lines", () => {
    const criteria = extractMatchCriteria("- Ít nhất 3 năm kinh nghiệm React\n- Biết TailwindCSS là lợi thế");

    expect(criteria).toHaveLength(2);
    expect(criteria[0]?.text).toBe("Ít nhất 3 năm kinh nghiệm React");
    expect(criteria[0]).toMatchObject({ importance: "required", constraintType: "quantitative", required: true, blocker: false, weight: 2 });
    expect(criteria[1]).toMatchObject({ importance: "preferred", constraintType: "hard_skill", required: false, blocker: false, weight: 1 });
  });

  it("preserves leading experience numbers while removing list markers", () => {
    const criteria = extractMatchCriteria(`
      1. 3+ năm kinh nghiệm React
      2) 2+ years of QA automation
      - 4+ năm kinh nghiệm backend Node.js
    `);

    expect(criteria.map((criterion) => criterion.text)).toEqual([
      "3+ năm kinh nghiệm React",
      "2+ years of QA automation",
      "4+ năm kinh nghiệm backend Node.js",
    ]);
    expect(criteria.map((criterion) => criterion.constraintType)).toEqual([
      "quantitative",
      "quantitative",
      "quantitative",
    ]);
  });

  it("ignores section headings when extracting criteria", () => {
    const criteria = extractMatchCriteria(`
      Key Responsibilities:
      - Design, develop, and maintain native iOS applications.
      Qualifications:
      Experience
      - Minimum 5 years of hands-on experience in native iOS application development.
      Technical Skills
      - Strong proficiency in Swift and SwiftUI.
    `);

    expect(criteria.map((criterion) => criterion.text)).toEqual([
      "Minimum 5 years of hands-on experience in native iOS application development.",
      "Strong proficiency in Swift and SwiftUI.",
    ]);
  });

  it("splits long prose requirements into stable granular criteria", () => {
    const criteria = extractMatchCriteria(
      "Ứng viên yêu cầu có ít nhất 3 năm kinh nghiệm React. Thành thạo TypeScript và xây dựng REST API. Có kinh nghiệm kiểm thử tự động là một lợi thế.",
    );

    expect(criteria.map((criterion) => criterion.text)).toEqual([
      "Ứng viên yêu cầu có ít nhất 3 năm kinh nghiệm React.",
      "Thành thạo TypeScript và xây dựng REST API.",
      "Có kinh nghiệm kiểm thử tự động là một lợi thế.",
    ]);
    expect(criteria.map((criterion) => criterion.required)).toEqual([true, true, false]);
    expect(criteria.map((criterion) => criterion.importance)).toEqual(["required", "required", "preferred"]);
    expect(criteria.map((criterion) => criterion.constraintType)).toEqual(["quantitative", "hard_skill", "general"]);
  });

  it("ignores Vietnamese section headings and classifies Vietnamese preference terms", () => {
    const criteria = extractMatchCriteria(`
      Yêu cầu công việc:
      - Tối thiểu 2 năm kinh nghiệm Node.js
      Kỹ năng:
      - Biết AWS là một điểm cộng
      Quyền lợi:
    `);

    expect(criteria).toHaveLength(2);
    expect(criteria[0]).toMatchObject({
      text: "Tối thiểu 2 năm kinh nghiệm Node.js",
      importance: "required",
      constraintType: "quantitative",
      required: true,
    });
    expect(criteria[1]).toMatchObject({
      text: "Biết AWS là một điểm cộng",
      importance: "preferred",
      constraintType: "hard_skill",
      required: false,
    });
  });

  it("classifies unaccented Vietnamese requirement terms", () => {
    const criteria = extractMatchCriteria(`
      Yeu cau cong viec:
      - Toi thieu 2 nam kinh nghiem Node.js
      - Uu tien tung lam san pham fintech hoac payment
      - Docker la mot diem cong
    `);

    expect(criteria).toHaveLength(3);
    expect(criteria.map((criterion) => criterion.importance)).toEqual([
      "required",
      "preferred",
      "preferred",
    ]);
    expect(criteria.map((criterion) => criterion.constraintType)).toEqual([
      "quantitative",
      "domain",
      "hard_skill",
    ]);
  });

  it("classifies soft skill criteria separately from hard skills", () => {
    const criteria = extractMatchCriteria(`
      - Có mắt thẩm mỹ và chú trọng chi tiết
      - Kỹ năng giao tiếp và làm việc nhóm xuất sắc
      - Hiểu transaction, locking và indexing trong PostgreSQL
    `);

    expect(criteria.map((criterion) => criterion.constraintType)).toEqual([
      "soft_skill",
      "soft_skill",
      "hard_skill",
    ]);
  });

  it("marks explicit must-have criteria as critical blockers", () => {
    const criteria = extractMatchCriteria("- React bắt buộc\n- AWS là lợi thế");

    expect(criteria[0]).toMatchObject({
      importance: "critical",
      constraintType: "hard_skill",
      required: true,
      blocker: true,
      weight: 4,
    });
    expect(criteria[1]).toMatchObject({
      importance: "preferred",
      constraintType: "hard_skill",
      required: false,
      blocker: false,
      weight: 1,
    });
  });

  it("caps criteria to keep prompts bounded", () => {
    const requirements = Array.from(
      { length: 20 },
      (_, index) => `- Yêu cầu kỹ năng số ${index + 1}`,
    ).join("\n");

    expect(extractMatchCriteria(requirements)).toHaveLength(15);
  });

  it("computes score in code instead of trusting a model-provided score", () => {
    const criteria = extractMatchCriteria("- React bắt buộc\n- TypeScript bắt buộc\n- TailwindCSS là lợi thế");
    const evaluations = evaluationMap([
      { criterionId: "criterion-1", status: "met", evidence: ["React"], reason: "Có bằng chứng" },
      { criterionId: "criterion-2", status: "partial", evidence: ["TypeScript"], reason: "Đáp ứng một phần" },
      { criterionId: "criterion-3", status: "not_met", evidence: [], reason: "Chưa đáp ứng" },
    ]);

    expect(calculateMatchScore(criteria, evaluations)).toBe(67);
  });

  it("caps high raw scores when a critical blocker has no grounded evidence", () => {
    const criteria = extractMatchCriteria(`
      - Work permit mandatory
      - React là lợi thế
      - TypeScript là lợi thế
      - Node.js là lợi thế
      - AWS là lợi thế
      - PostgreSQL là lợi thế
      - Docker là lợi thế
      - CI/CD là lợi thế
    `);
    const evaluations = evaluationMap([
      { criterionId: "criterion-1", status: "unknown", evidence: [], reason: "Không có bằng chứng" },
      { criterionId: "criterion-2", status: "met", evidence: ["React"], reason: "Có bằng chứng" },
      { criterionId: "criterion-3", status: "met", evidence: ["TypeScript"], reason: "Có bằng chứng" },
      { criterionId: "criterion-4", status: "met", evidence: ["Node.js"], reason: "Có bằng chứng" },
      { criterionId: "criterion-5", status: "met", evidence: ["AWS"], reason: "Có bằng chứng" },
      { criterionId: "criterion-6", status: "met", evidence: ["PostgreSQL"], reason: "Có bằng chứng" },
      { criterionId: "criterion-7", status: "met", evidence: ["Docker"], reason: "Có bằng chứng" },
      { criterionId: "criterion-8", status: "met", evidence: ["CI/CD"], reason: "Có bằng chứng" },
    ]);

    expect(calculateMatchScore(criteria, evaluations)).toBe(55);
  });

  it("caps otherwise high scores when a quantitative required criterion is only partial", () => {
    const criteria = extractMatchCriteria(`
      - 2+ năm kinh nghiệm QA automation
      - Thành thạo Selenium
      - Biết test API và đọc log backend
      - Có tư duy phân tích lỗi rõ ràng
      - Performance testing là lợi thế
    `);
    const evaluations = evaluationMap([
      { criterionId: "criterion-1", status: "partial", evidence: ["QA automation"], reason: "Có kinh nghiệm nhưng không rõ số năm" },
      { criterionId: "criterion-2", status: "met", evidence: ["Selenium"], reason: "Có bằng chứng" },
      { criterionId: "criterion-3", status: "met", evidence: ["API"], reason: "Có bằng chứng" },
      { criterionId: "criterion-4", status: "met", evidence: ["phân tích lỗi"], reason: "Có bằng chứng" },
      { criterionId: "criterion-5", status: "met", evidence: ["Performance"], reason: "Có bằng chứng" },
    ]);

    expect(calculateMatchScore(criteria, evaluations)).toBe(85);
  });

  it("reports evidence confidence separately from match score", () => {
    const criteria = extractMatchCriteria("- React bắt buộc\n- TypeScript bắt buộc\n- TailwindCSS là lợi thế");
    const evaluations = evaluationMap([
      { criterionId: "criterion-1", status: "met", evidence: ["React"], reason: "Có bằng chứng" },
      { criterionId: "criterion-2", status: "unknown", evidence: [], reason: "Không đủ dữ liệu" },
      { criterionId: "criterion-3", status: "met", evidence: ["TailwindCSS"], reason: "Có bằng chứng" },
    ]);

    expect(calculateConfidence(criteria, evaluations)).toBe(56);
  });
});

function evaluationMap(evaluations: CriterionEvaluation[]) {
  return new Map(evaluations.map((evaluation) => [evaluation.criterionId, evaluation]));
}
