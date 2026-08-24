import { cvSummarySchema } from ".";

function summaryWithDuration(duration: string | null) {
  return {
    overview: "Ứng viên có kinh nghiệm phát triển phần mềm.",
    currentTitle: "Developer",
    totalExperience: "5 năm",
    keySkills: [],
    workExperiences: [{ company: "FPT", title: "Developer", duration }],
    workCompanies: [],
    workHighlights: [],
    education: [],
    languages: [],
    notesForTa: [],
  };
}

describe("cvSummarySchema", () => {
  it("keeps complete work periods", () => {
    const parsed = cvSummarySchema.parse(summaryWithDuration("Jan 2020 – Nov 2022"));

    expect(parsed.workExperiences[0]?.duration).toBe("Jan 2020 – Nov 2022");
  });

  it("converts a lone work date to null", () => {
    const parsed = cvSummarySchema.parse(summaryWithDuration("Nov 2025"));

    expect(parsed.workExperiences[0]?.duration).toBeNull();
  });
});
