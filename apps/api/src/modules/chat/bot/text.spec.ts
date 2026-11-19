import { isHandoffRequest, normalizeForMatching, truncateText } from "./text";

describe("chat bot text helpers", () => {
  it("normalizes Vietnamese diacritics for matching", () => {
    expect(normalizeForMatching("Đãi ngộ & PHÚC LỢI?")).toBe("dai ngo phuc loi");
  });

  it.each(["Cho mình gặp HR được không?", "Em muốn nói chuyện với chị Bích", "Can I talk to a human please", "chat với TA"])(
    "detects a request for a human: %s",
    message => expect(isHandoffRequest(message)).toBe(true),
  );

  it.each(["Lương vị trí này bao nhiêu?", "Công ty có làm hybrid không", "gặp gỡ"])(
    "does not flag ordinary questions: %s",
    message => expect(isHandoffRequest(message)).toBe(false),
  );

  it("truncates long text with an ellipsis", () => {
    expect(truncateText("abcdefghij", 5)).toBe("abcd…");
    expect(truncateText("  short  ", 10)).toBe("short");
  });
});
