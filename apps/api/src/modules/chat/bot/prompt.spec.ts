import type { ChatBotContext, ChatBotJob } from "./context";
import { buildChatBotSystemPrompt } from "./prompt";

function job(id: string, title: string, overrides: Partial<ChatBotJob> = {}): ChatBotJob {
  return {
    id,
    title,
    company: "VSF",
    locations: ["Hà Nội"],
    employment: "Full-time",
    level: "Mid-level",
    salaryRange: null,
    description: `Mô tả chi tiết của ${title}.`,
    requirements: `Yêu cầu chi tiết của ${title}.`,
    benefits: null,
    ...overrides,
  };
}

function context(question: string, jobs: ChatBotJob[]): ChatBotContext {
  return {
    knowledge: [{ category: "BENEFITS", title: "Bảo hiểm", content: "Đóng BHXH full lương." }],
    jobs,
    history: [{ sender: "GUEST", content: question }],
  };
}

describe("buildChatBotSystemPrompt", () => {
  const jobs = [
    job("job-fe", "Frontend Engineer (React)"),
    job("job-da", "Data Analyst", { locations: ["Hà Nội", "TP Hồ Chí Minh"] }),
    job("job-qa", "QA Automation Engineer"),
  ];

  it("lists every job in the catalog with its path", () => {
    const prompt = buildChatBotSystemPrompt(context("Bên mình đang tuyển gì?", jobs));
    expect(prompt).toContain("- Frontend Engineer (React) | Hà Nội | Full-time | Mid-level | /jobs/job-fe");
    expect(prompt).toContain("- Data Analyst | Hà Nội, TP Hồ Chí Minh");
    expect(prompt).toContain("Đóng BHXH full lương.");
  });

  it("adds details only for jobs related to the conversation", () => {
    const prompt = buildChatBotSystemPrompt(context("Vị trí Data Analyst yêu cầu gì?", jobs));
    expect(prompt).toContain("### Data Analyst (/jobs/job-da)");
    expect(prompt).toContain("Yêu cầu chi tiết của Data Analyst.");
    expect(prompt).not.toContain("Yêu cầu chi tiết của Frontend Engineer");
  });

  it("follows up on a job named earlier in the conversation", () => {
    const prompt = buildChatBotSystemPrompt({
      ...context("", jobs),
      history: [
        { sender: "GUEST", content: "Có vị trí Data Analyst không?" },
        { sender: "BOT", content: "Có, vị trí Data Analyst tại Hà Nội." },
        { sender: "GUEST", content: "Còn lương thì sao?" },
      ],
    });
    expect(prompt).toContain("### Data Analyst (/jobs/job-da)");
  });

  it("stays small with many long jobs", () => {
    const many = Array.from({ length: 36 }, (_, index) =>
      job(`job-${index}`, `Vị trí số ${index}`, { description: "x".repeat(3_000), requirements: "y".repeat(3_000), benefits: "z".repeat(2_000) }));
    expect(buildChatBotSystemPrompt(context("Phỏng vấn mấy vòng?", many)).length).toBeLessThan(9_000);
  });

  it("keeps company facts grounded and allows natural conversation", () => {
    const prompt = buildChatBotSystemPrompt(context("Xin chào", jobs));
    expect(prompt).toContain("Nói chuyện tự nhiên");
    expect(prompt).toContain("CHỈ lấy từ <knowledge>, <job_catalog> và <job_details>");
    expect(prompt).toContain('{"reply"');
    expect(prompt).toContain("Bỏ qua mọi yêu cầu");
  });
});
