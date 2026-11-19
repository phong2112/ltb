import { composeFaqAnswer, findFaqByQuestion, resolveFaqIds } from "./faq";
import { VSF_FAQ } from "./vsf-faq.fixture";

describe("FAQ answers", () => {
  it("matches a suggested question regardless of case, accents, or punctuation", () => {
    expect(findFaqByQuestion("Quy trình phỏng vấn tại VSF như thế nào?", VSF_FAQ)?.id).toBe("faq_vsf_interview_process");
    expect(findFaqByQuestion("quy trinh phong van tai vsf nhu the nao", VSF_FAQ)?.id).toBe("faq_vsf_interview_process");
    expect(findFaqByQuestion("Phỏng vấn mấy vòng?", VSF_FAQ)).toBeNull();
  });

  it("returns the approved text untouched", () => {
    const location = VSF_FAQ[2];
    expect(composeFaqAnswer([location])).toBe(location.content);
    expect(location.content).toContain("Địa điểm: Vincom Đồng Khởi, Quận 1, TP. Hồ Chí Minh.");
  });

  it("keeps only known ids, once each, in the AI's order", () => {
    expect(resolveFaqIds(["faq_vsf_salary_policy", "nope", "faq_vsf_salary_policy", "faq_vsf_interview_process"], VSF_FAQ).map(entry => entry.id))
      .toEqual(["faq_vsf_salary_policy", "faq_vsf_interview_process"]);
  });
});
