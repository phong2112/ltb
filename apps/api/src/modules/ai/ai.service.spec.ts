import type { CriterionEvaluation } from "./ai.types";
import { calculateConfidence, calculateMatchScore, extractMatchCriteria } from "./match-scoring";

describe("AI match scoring", () => {
  it("extracts required and preferred criteria from normalized requirement lines", () => {
    const criteria = extractMatchCriteria("- Ít nhất 3 năm kinh nghiệm React\n- Biết TailwindCSS là lợi thế");

    expect(criteria).toHaveLength(2);
    expect(criteria[0]).toMatchObject({ required: true, weight: 2 });
    expect(criteria[1]).toMatchObject({ required: false, weight: 1 });
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
