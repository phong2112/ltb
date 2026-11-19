import type { ChatBotJob } from "./context";
import { buildQuery, rankRelevantJobs, scoreJob } from "./relevance";

const base: Omit<ChatBotJob, "id" | "title"> = {
  company: "VSF", locations: ["Hà Nội"], employment: "Full-time", level: null, salaryRange: null,
  description: "", requirements: "", benefits: null,
};
const dataAnalyst: ChatBotJob = { ...base, id: "da", title: "Data Analyst" };
const operations: ChatBotJob = {
  ...base,
  id: "ops",
  title: "Chuyên viên vận hành phần mềm",
  description: "Phân tích dữ liệu vận hành, data pipeline, analyst support. ".repeat(30),
};

describe("relevance", () => {
  it("weights job titles far above description words", () => {
    const query = buildQuery("Data Analyst");
    expect(scoreJob(query, dataAnalyst)).toBeGreaterThan(scoreJob(query, operations));
  });

  it("returns no detailed jobs for questions not about a specific job", () => {
    expect(rankRelevantJobs([dataAnalyst, operations], { latestQuestion: "Phỏng vấn mấy vòng?", recentText: "Phỏng vấn mấy vòng?", limit: 2 })).toEqual([]);
  });

  it("finds the job from recent turns for a follow-up question", () => {
    const ranked = rankRelevantJobs([dataAnalyst, operations], {
      latestQuestion: "Còn lương thì sao?",
      recentText: "Có vị trí Data Analyst không?\nCó, Data Analyst tại Hà Nội.\nCòn lương thì sao?",
      limit: 2,
    });
    expect(ranked.map(job => job.id)).toEqual(["da"]);
  });

  it("ignores words shared by many job titles", () => {
    const specialists = Array.from({ length: 6 }, (_, index) => ({ ...base, id: `s${index}`, title: `Chuyên viên mảng ${index}` }));
    const ranked = rankRelevantJobs(specialists, { latestQuestion: "Cảm ơn nhé", recentText: "Ứng viên sẽ nhận kết quả.\nCảm ơn nhé", limit: 2 });
    expect(ranked).toEqual([]);
  });
});
