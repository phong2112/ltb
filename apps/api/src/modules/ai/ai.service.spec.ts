import type { CriterionEvaluation } from "./ai.types";
import { calculateConfidence, calculateMatchScore, extractMatchCriteria } from "./match-scoring";

describe("AI match scoring", () => {
  it("extracts required and preferred criteria from normalized requirement lines", () => {
    const criteria = extractMatchCriteria("- Ít nhất 3 năm kinh nghiệm React\n- Biết TailwindCSS là lợi thế");

    expect(criteria).toHaveLength(2);
    expect(criteria[0]).toMatchObject({ required: true, weight: 2 });
    expect(criteria[1]).toMatchObject({ required: false, weight: 1 });
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
      "Design, develop, and maintain native iOS applications.",
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
      required: true,
    });
    expect(criteria[1]).toMatchObject({
      text: "Biết AWS là một điểm cộng",
      required: false,
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

    expect(calculateMatchScore(criteria, evaluations)).toBe(60);
  });

  it("reports evidence confidence separately from match score", () => {
    const criteria = extractMatchCriteria("- React bắt buộc\n- TypeScript bắt buộc\n- TailwindCSS là lợi thế");
    const evaluations = evaluationMap([
      { criterionId: "criterion-1", status: "met", evidence: ["React"], reason: "Có bằng chứng" },
      { criterionId: "criterion-2", status: "unknown", evidence: [], reason: "Không đủ dữ liệu" },
      { criterionId: "criterion-3", status: "met", evidence: ["TailwindCSS"], reason: "Có bằng chứng" },
    ]);

    expect(calculateConfidence(criteria, evaluations)).toBe(60);
  });
});

function evaluationMap(evaluations: CriterionEvaluation[]) {
  return new Map(evaluations.map((evaluation) => [evaluation.criterionId, evaluation]));
}
