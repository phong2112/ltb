import { buildSourcingQueries, normalizeLinkedinProfileUrl, normalizeSourcingProfileUrl } from ".";

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
});
