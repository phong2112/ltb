import type { MatchCriterion } from "./ai.types";
import { buildGroundedMatchInsights, groundCriterionEvaluations } from "./match-analysis";

const criteria: MatchCriterion[] = [
  { id: "criterion-1", text: "React bắt buộc", importance: "critical", constraintType: "hard_skill", required: true, blocker: true, weight: 4 },
  { id: "criterion-2", text: "TypeScript bắt buộc", importance: "critical", constraintType: "hard_skill", required: true, blocker: true, weight: 4 },
  { id: "criterion-3", text: "AWS là lợi thế", importance: "preferred", constraintType: "hard_skill", required: false, blocker: false, weight: 1 },
];

describe("grounded match analysis", () => {
  it("downgrades model claims whose evidence cannot be found in the CV", () => {
    const evaluations = groundCriterionEvaluations(criteria, [
      {
        criterionId: "criterion-1",
        status: "met",
        evidence: ["5 years building React products"],
        reason: "Có React",
      },
      {
        criterionId: "criterion-2",
        status: "met",
        evidence: ["Expert TypeScript"],
        reason: "Có TypeScript",
      },
    ], "Frontend Engineer. 5 years building React products.");

    expect(evaluations.get("criterion-1")?.status).toBe("met");
    expect(evaluations.get("criterion-2")).toMatchObject({
      status: "unknown",
      evidence: [],
    });
  });

  it("derives strengths and required gaps from the same grounded evaluations", () => {
    const evaluations = groundCriterionEvaluations(criteria, [
      {
        criterionId: "criterion-1",
        status: "met",
        evidence: ["React"],
        reason: "Có React",
      },
      {
        criterionId: "criterion-2",
        status: "partial",
        evidence: ["TypeScript basic"],
        reason: "Chỉ nêu mức cơ bản",
      },
      {
        criterionId: "criterion-3",
        status: "unknown",
        evidence: [],
        reason: "Không thấy AWS",
      },
    ], "React, TypeScript basic");
    const insights = buildGroundedMatchInsights(criteria, evaluations);

    expect(insights.strengths[0]).toContain("React bắt buộc");
    expect(insights.risks[0]).toContain("TypeScript bắt buộc");
    expect(insights.missingRequirements).toEqual([
      "Cần làm rõ phần còn thiếu: TypeScript bắt buộc",
    ]);
    expect(insights.missingRequirements.join(" ")).not.toContain("AWS");
  });
});
