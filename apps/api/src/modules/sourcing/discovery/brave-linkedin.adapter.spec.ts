import { BraveLinkedinDiscoveryAdapter } from "./brave-linkedin.adapter";

describe("BraveLinkedinDiscoveryAdapter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps Brave web results to normalized LinkedIn discovery results", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        web: {
          results: [
            {
              title: "Nguyen Van A - Senior QA Engineer | LinkedIn",
              url: "https://www.linkedin.com/in/nguyen-van-a/?trk=public_profile",
              description: "Senior QA Engineer in Ho Chi Minh with Playwright and API testing.",
              extra_snippets: ["Automation testing, Selenium, Vietnam"],
            },
            {
              title: "Company Page | LinkedIn",
              url: "https://www.linkedin.com/company/example",
              description: "Not a people profile.",
            },
          ],
        },
      }),
    });
    global.fetch = fetchMock as never;

    const adapter = new BraveLinkedinDiscoveryAdapter("token");
    await expect(adapter.discover({
      id: "q1",
      source: "LINKEDIN",
      type: "XRAY",
      label: "LinkedIn",
      query: "site:linkedin.com/in Senior QA Vietnam",
      searchUrl: "https://example.com",
      priority: 1,
    }, 10)).resolves.toEqual([expect.objectContaining({
      displayName: "Nguyen Van A",
      normalizedProfileUrl: "https://www.linkedin.com/in/nguyen-van-a",
      queryId: "q1",
      searchRank: 1,
      snippet: expect.stringContaining("Playwright"),
    })]);

    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      headers: expect.objectContaining({ "X-Subscription-Token": "token" }),
    }));
  });
});
