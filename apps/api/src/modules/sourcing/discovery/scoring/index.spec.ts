import { scoreLinkedinDiscoveryResult } from ".";

describe("scoreLinkedinDiscoveryResult", () => {
  it("does not match short skill signals inside unrelated words", () => {
    const result = scoreLinkedinDiscoveryResult({
      source: "LINKEDIN",
      profileUrl: "https://www.linkedin.com/in/example",
      normalizedProfileUrl: "https://www.linkedin.com/in/example",
      displayName: "Example",
      headline: "Chair maker",
      snippet: "Designs handcrafted chairs",
      queryId: "q1",
      query: "site:linkedin.com/in AI Engineer",
      searchRank: 1,
      fetchedAt: new Date(),
    }, {
      title: "AI Engineer",
      locations: [],
      tags: ["AI"],
      description: "Build AI products",
      requirements: "AI experience",
    });

    expect(result.matchedSignals).not.toContain("AI");
    expect(result.missingSignals).toContain("AI");
  });

  it("matches Vietnamese signals regardless of diacritics", () => {
    const result = scoreLinkedinDiscoveryResult({
      source: "LINKEDIN",
      profileUrl: "https://www.linkedin.com/in/example",
      normalizedProfileUrl: "https://www.linkedin.com/in/example",
      displayName: "Example",
      headline: "QA Engineer",
      snippet: "Automation engineer in Ha Noi",
      queryId: "q1",
      query: "site:linkedin.com/in QA Engineer",
      searchRank: 1,
      fetchedAt: new Date(),
    }, {
      title: "QA Engineer",
      locations: ["Hà Nội"],
      tags: ["Automation"],
      description: "Build tests",
      requirements: "Automation",
    });

    expect(result.matchedSignals).toEqual(expect.arrayContaining(["Hà Nội", "Automation"]));
  });
});
