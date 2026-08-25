import { assessLinkedinLocation } from "./location";
import type { LinkedinDiscoveryResult } from "./types";

describe("assessLinkedinLocation", () => {
  it.each([
    ["Hanoi", "ELIGIBLE"],
    ["Ho Chi Minh City, Vietnam", "ELIGIBLE"],
    ["Da Nang", "ELIGIBLE"],
    ["Bengaluru, India", "INELIGIBLE"],
    ["Hyderabad", "INELIGIBLE"],
  ])("classifies %s as %s for Vietnam campaigns", (snippet, eligibility) => {
    expect(assessLinkedinLocation(result(snippet), "VIETNAM")).toMatchObject({ eligibility });
  });

  it("keeps missing location evidence out of the qualified shortlist", () => {
    expect(assessLinkedinLocation(result("Senior AI Engineer building LLM products"), "VIETNAM"))
      .toEqual({ eligibility: "NEEDS_VERIFICATION" });
  });

  it("requires verification when evidence contains conflicting countries", () => {
    expect(assessLinkedinLocation(result("Based in India, working with a team in Vietnam"), "VIETNAM"))
      .toMatchObject({ eligibility: "NEEDS_VERIFICATION" });
  });

  it("does not apply a country gate to global campaigns", () => {
    expect(assessLinkedinLocation(result("Bengaluru, India"), "GLOBAL"))
      .toEqual({ eligibility: "NOT_APPLICABLE" });
  });
});

function result(snippet: string): LinkedinDiscoveryResult {
  return {
    source: "LINKEDIN",
    profileUrl: "https://www.linkedin.com/in/example",
    normalizedProfileUrl: "https://www.linkedin.com/in/example",
    displayName: "Example Candidate",
    headline: "AI Engineer",
    snippet,
    queryId: "q1",
    query: "site:linkedin.com/in AI Engineer",
    searchRank: 1,
    fetchedAt: new Date(),
  };
}
