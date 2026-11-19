import type { ChatBotJob } from "./context";
import { detectJobListing, filterJobs, formatJobListing } from "./job-listing";

const job = (id: string, title: string, locations: string[]): ChatBotJob => ({
  id, title, locations, company: "VSF", employment: "Full-time", level: null, salaryRange: null, description: "", requirements: "", benefits: null,
});
const jobs = [
  job("da", "Data Analyst (Growth Analytics)", ["Hà Nội", "TP Hồ Chí Minh"]),
  job("ios", "Senior iOS (Chat)", ["Hà Nội"]),
  job("go", "Senior Golang (Chat)", ["TP Hồ Chí Minh"]),
];

describe("detectJobListing", () => {
  it.each([
    "Đang tuyển những vị trí nào?",
    "dang tuyen nhung vi tri nao",
    "Bên mình đang tuyển vị trí gì vậy?",
    "Có job nào không ạ?",
    "Công ty có những vị trí nào đang tuyển?",
    "Xin chào, cho mình hỏi đang tuyển vị trí nào vậy?",
    "What positions are you hiring?",
  ])("treats %s as a request for all open jobs", question => {
    expect(detectJobListing(question)).toEqual({ filters: [] });
  });

  it.each([
    ["Có vị trí nào ở Hồ Chí Minh không?", ["hcm"]],
    ["co vi tri nao o hcm khong", ["hcm"]],
    ["Có việc gì ở Sài Gòn không?", ["hcm"]],
    ["Có việc gì ở HN không?", ["hanoi"]],
  ])("keeps location words as filters: %s", (question, filters) => {
    expect(detectJobListing(question)?.filters).toEqual(filters);
  });

  it.each([
    "Mức lương cho vị trí đang tuyển là bao nhiêu?",
    "lương vị trí đang tuyển bao nhiêu",
    "Vị trí nào lương cao nhất?",
    "Quy trình tuyển dụng thế nào?",
    "Phỏng vấn mấy vòng?",
    "Có vị trí Data Analyst không?",
    "Vị trí DevOps cần gì?",
    "Yêu cầu của Senior iOS là gì?",
    "Thời tiết hôm nay thế nào?",
  ])("does not treat %s as a job-list request", question => {
    expect(detectJobListing(question)).toBeNull();
  });
});

describe("formatJobListing", () => {
  it("lists real jobs with their links", () => {
    const text = formatJobListing(jobs);
    expect(text).toContain("Hiện đang tuyển 3 vị trí:");
    expect(text).toContain("- Senior iOS (Chat) (Hà Nội): /jobs/ios");
  });

  it("filters by location", () => {
    expect(filterJobs(jobs, ["hcm"]).map(item => item.id)).toEqual(["da", "go"]);
    expect(formatJobListing(jobs, ["hanoi"])).toContain("Có 2 vị trí phù hợp:");
  });

  it("falls back to every job when nothing matches the filter", () => {
    expect(formatJobListing(jobs, ["danang"])).toContain("Mình chưa thấy vị trí khớp đúng yêu cầu");
  });

  it("says so when no job is open", () => {
    expect(formatJobListing([])).toContain("Hiện chưa có vị trí nào đang mở tuyển");
  });
});
