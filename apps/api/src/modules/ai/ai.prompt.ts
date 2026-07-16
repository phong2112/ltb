import type { AnalyzeMatchInput } from "./ai.types";

export const MATCH_PROMPT_VERSION = "cv-jd-match-v1";

export function buildMatchPrompt(input: AnalyzeMatchInput) {
  return `
Đánh giá mức độ phù hợp giữa CV và vị trí tuyển dụng dưới đây.

Quy tắc bắt buộc:
- Chỉ dùng bằng chứng xuất hiện rõ ràng trong CV. Không suy đoán kỹ năng hoặc kinh nghiệm.
- Nếu CV không đủ thông tin cho một tiêu chí, dùng trạng thái "unknown", không dùng "not_met".
- "not_met" chỉ dùng khi CV có bằng chứng mâu thuẫn hoặc không đạt yêu cầu định lượng.
- Evidence phải là trích đoạn ngắn từ CV. Không đưa email, số điện thoại, địa chỉ hoặc dữ liệu nhận dạng vào evidence.
- Không dùng tên, tuổi, giới tính, ảnh, tình trạng hôn nhân hoặc đặc điểm được bảo vệ để đánh giá.
- Viết summary, reason, strengths, risks và screeningQuestions bằng tiếng Việt.
- Trả đúng một evaluation cho mỗi criterionId được cung cấp.

Vị trí: ${input.jobTitle}

Mô tả công việc:
${input.jobDescription}

Tiêu chí chấm điểm:
${JSON.stringify(input.criteria, null, 2)}

Nội dung CV:
${input.cvText}
`.trim();
}
