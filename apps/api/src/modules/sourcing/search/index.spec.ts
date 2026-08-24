import { buildLinkedinDiscoveryQueries, buildSourcingQueries, normalizeLinkedinProfileUrl, normalizeSourcingProfileUrl, prepareSourcingProfileUrl } from ".";

describe("LinkedIn-first sourcing search", () => {
  const job = {
    title: "AI Engineer",
    company: "LTB",
    department: "Engineering",
    locations: ["TP Hồ Chí Minh"],
    level: "Senior",
    tags: ["Python", "LLM", "Machine Learning"],
    description: "Build AI products",
    requirements: "3+ years of Python\nExperience with LLM",
  };

  it("generates multi-source queries with LinkedIn as the highest priority", () => {
    const queries = buildSourcingQueries(job);

    expect(queries.length).toBeGreaterThan(4);
    expect(queries.slice(0, 4).every((query) => query.source === "LINKEDIN")).toBe(true);
    expect(queries.map((query) => query.source)).toEqual(expect.arrayContaining(["GITHUB", "PUBLIC_WEB", "ITVIEC", "VIETNAMWORKS", "FACEBOOK"]));
    expect(queries[0]).toMatchObject({ id: "linkedin-core", priority: 1 });
    expect(queries[0].query).toContain('"AI Engineer"');
    expect(queries[0].query).toContain('"Python"');
    expect(queries[0].query).toContain('"TP Hồ Chí Minh"');
  });

  it("keeps Vietnam targeting as query terms for LinkedIn discovery", () => {
    const queries = buildLinkedinDiscoveryQueries(job);

    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => !query.query.includes("loc:vn"))).toBe(true);
    expect(queries[0].query).toContain('"TP Hồ Chí Minh"');
    expect(queries[0].query).toContain('"Vietnam"');
  });

  it("can build global LinkedIn discovery queries without location terms", () => {
    const queries = buildLinkedinDiscoveryQueries(job, { locationScope: "GLOBAL" });

    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0].query).not.toContain('"TP Hồ Chí Minh"');
    expect(queries[0].query).not.toContain('"Vietnam"');
  });

  it("adds bounded AI query enhancements without replacing deterministic JD signals", () => {
    const queries = buildLinkedinDiscoveryQueries(job, {
      enhancements: {
        titleVariants: ["Applied AI Engineer", "ML Platform Engineer"],
        skillSignals: ["Generative AI", "Model Serving"],
      },
    });

    expect(queries[0].query).toContain('"AI Engineer"');
    expect(queries[0].query).toContain('"Applied AI Engineer"');
    expect(queries.some((query) => query.query.includes('"Generative AI"'))).toBe(true);
  });

  it("expands business analyst typos and JD tool signals for LinkedIn discovery", () => {
    const queries = buildLinkedinDiscoveryQueries({
      ...job,
      title: "Business Analystic",
      locations: ["Hà Nội"],
      tags: ["Unit Test", "Integration Test"],
      requirements: "Business Analyst. Thành thạo Jira, Confluence, Figma.",
    });

    expect(queries[0].query).toContain('"Business Analyst"');
    expect(queries[0].query).toContain('"Jira"');
    expect(queries[0].query).toContain('"Hanoi"');
  });

  it("normalizes supported LinkedIn profile URLs and removes tracking", () => {
    expect(normalizeLinkedinProfileUrl("linkedin.com/in/phong-nguyen/?trk=abc")).toBe(
      "https://www.linkedin.com/in/phong-nguyen",
    );
    expect(normalizeLinkedinProfileUrl("https://M.LINKEDIN.com/IN/Phong-Nguyen#about")).toBe(
      "https://www.linkedin.com/in/phong-nguyen",
    );
    expect(normalizeLinkedinProfileUrl("https://example.com/in/phong")).toBeNull();
    expect(normalizeLinkedinProfileUrl("https://linkedin.com/company/ltb")).toBeNull();
  });

  it("normalizes URLs for supported non-LinkedIn sources", () => {
    expect(normalizeSourcingProfileUrl("github.com/Phong2112?tab=repositories", "GITHUB")).toBe(
      "https://github.com/phong2112",
    );
    expect(normalizeSourcingProfileUrl("https://facebook.com/some.candidate?mibextid=abc", "FACEBOOK")).toBe(
      "https://facebook.com/some.candidate",
    );
    expect(normalizeSourcingProfileUrl("https://facebook.com/profile.php?id=123&utm_source=x", "FACEBOOK")).toBe(
      "https://facebook.com/profile.php?id=123",
    );
    expect(normalizeSourcingProfileUrl("https://example.com/profile/phong?utm_source=x", "PUBLIC_WEB")).toBe(
      "https://example.com/profile/phong",
    );
    expect(normalizeSourcingProfileUrl("https://github.com/features", "GITHUB")).toBeNull();
  });

  it("preserves a case-sensitive public path while using a canonical dedupe value", () => {
    expect(prepareSourcingProfileUrl(
      "https://Portfolio.Example.com/NguyenA/CaseStudy?utm_source=linkedin#work",
      "PUBLIC_WEB",
    )).toEqual({
      profileUrl: "https://portfolio.example.com/NguyenA/CaseStudy",
      normalizedProfileUrl: "https://portfolio.example.com/nguyena/casestudy",
    });
  });
});
