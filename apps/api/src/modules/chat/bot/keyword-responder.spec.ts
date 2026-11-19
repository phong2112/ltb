import type { ChatBotContext, ChatBotJob, ChatBotKnowledge } from "./context";
import { answerFromKeywords } from "./keyword-responder";
import { CHAT_BOT_FALLBACK_REPLIES } from "./prompt";

// Mirrors the VSF FAQ inserted by migration 20261119120100_seed_chat_knowledge_vsf.
const vsfFaq: ChatBotKnowledge[] = [
  { category: "RECRUITMENT_PROCESS", title: "Quy trình phỏng vấn tại VSF như thế nào?", content: "01 vòng phỏng vấn online khoảng 60 phút." },
  { category: "BENEFITS", title: "Mức lương cho vị trí đang tuyển là bao nhiêu?", content: "VSF chưa công bố trước khung lương cụ thể." },
  { category: "COMPANY_POLICY", title: "Thời gian và địa điểm làm việc tại VSF như thế nào?", content: "Văn phòng Hà Nội: Technopark. Văn phòng TP. Hồ Chí Minh: Vincom Đồng Khởi." },
  { category: "RECRUITMENT_PROCESS", title: "Sau khi ứng tuyển, bao lâu tôi sẽ nhận được phản hồi về CV?", content: "Khoảng 01 tuần kể từ khi nhận hồ sơ." },
  { category: "RECRUITMENT_PROCESS", title: "Sau phỏng vấn bao lâu sẽ có kết quả?", content: "Trong khoảng 02 – 05 ngày làm việc." },
];

const jobs: ChatBotJob[] = [
  {
    id: "job-devops",
    title: "DevOps Engineer",
    company: "VSF",
    locations: ["TP Hồ Chí Minh"],
    employment: "Hybrid",
    level: "Senior",
    salaryRange: null,
    description: "Improve deployment and CI/CD.",
    requirements: "Docker, Kubernetes, AWS",
    benefits: "Certification budget",
  },
  {
    id: "job-ba",
    title: "Business Analyst",
    company: "VSF",
    locations: ["Hà Nội"],
    employment: "Full-time",
    level: null,
    salaryRange: null,
    description: "Gather requirements.",
    requirements: "SQL, documentation",
    benefits: null,
  },
];

function ask(question: string, knowledge = vsfFaq): ChatBotContext {
  return { knowledge, jobs, history: [{ sender: "GUEST", content: question }] };
}

describe("answerFromKeywords", () => {
  it.each([
    ["Phỏng vấn gồm mấy vòng ạ?", "60 phút"],
    ["Lương bao nhiêu vậy chị?", "chưa công bố"],
    ["Văn phòng ở đâu?", "Technopark"],
    ["Nộp CV xong bao lâu thì có phản hồi?", "01 tuần"],
    ["Phỏng vấn xong bao lâu có kết quả?", "05 ngày"],
  ])("answers the VSF FAQ: %s", (question, expected) => {
    const reply = answerFromKeywords(ask(question));
    expect(reply.handoff).toBe(false);
    expect(reply.content).toContain(expected);
  });

  it("answers with job details and the apply link", () => {
    const reply = answerFromKeywords(ask("Vị trí DevOps cần kubernetes không?", []));
    expect(reply.content).toContain("DevOps Engineer");
    expect(reply.content).toContain("/jobs/job-devops/apply");
  });

  it("lists open jobs for a generic jobs question", () => {
    const reply = answerFromKeywords(ask("Đang tuyển vị trí nào vậy?", []));
    expect(reply.content).toContain("/jobs/job-ba");
    expect(reply.handoff).toBe(false);
  });

  it("hands off when nothing matches", () => {
    expect(answerFromKeywords(ask("Thời tiết hôm nay"))).toEqual({ content: CHAT_BOT_FALLBACK_REPLIES.unknown, handoff: true });
  });
});
