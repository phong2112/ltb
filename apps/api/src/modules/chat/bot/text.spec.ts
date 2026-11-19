import { detectSmallTalk, htmlToPlainText, isHandoffRequest, normalizeForMatching, truncateText } from "./text";

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

  it.each([
    ["Xin chào ạ", "greeting"],
    ["Hi", "greeting"],
    ["Cảm ơn bạn nhiều", "thanks"],
    ["Tạm biệt", "goodbye"],
    ["Lương bao nhiêu?", null],
    ["Chiến lược công ty", null],
  ])("classifies small talk: %s", (message, expected) => {
    expect(detectSmallTalk(message)).toBe(expected);
  });

  it("truncates long text with an ellipsis", () => {
    expect(truncateText("abcdefghij", 5)).toBe("abcd…");
    expect(truncateText("  short  ", 10)).toBe("short");
  });

  it("converts rich-text job HTML to plain text", () => {
    const html = "<p><strong>1. Trình độ</strong></p><ul><li><p>Tốt nghiệp Đại học &amp; có 3 năm kinh nghiệm.</p></li><li><p>Vingroup&#39;s ecosystem</p></li></ul>";
    expect(htmlToPlainText(html)).toBe("1. Trình độ\n- Tốt nghiệp Đại học & có 3 năm kinh nghiệm.\n- Vingroup's ecosystem");
    expect(htmlToPlainText(null)).toBe("");
  });
});
