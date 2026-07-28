import type { AnalyzeMatchInput, ExtractProfileInput } from "./ai.types";

export const MATCH_PROMPT_VERSION = "cv-jd-match-v1";
export const EXTRACT_PROFILE_PROMPT_VERSION = "cv-profile-extract-v1";

export function buildExtractProfilePrompt(input: ExtractProfileInput) {
  return `
Trích xuất thông tin hồ sơ ứng viên từ nội dung CV dưới đây để lưu vào kho ứng viên.

Quy tắc bắt buộc:
- Chỉ dùng thông tin xuất hiện rõ ràng trong CV. Không suy đoán, không bịa.
- fullName: họ tên đầy đủ của ứng viên. Nếu không xác định được, trả về null.
- title: chức danh/vị trí hiện tại hoặc gần nhất. Nếu không có, trả về null.
- totalYearsExperience: tổng số năm kinh nghiệm (số). Nếu không suy ra được, trả về null.
- skills: danh sách kỹ năng/công nghệ nêu trong CV (tối đa 30 mục, ngắn gọn).
- languages: danh sách ngôn ngữ (tối đa 10).
- KHÔNG đưa email, số điện thoại hay địa chỉ vào bất kỳ trường nào ở trên.
- Chỉ trả về một JSON object hợp lệ, không markdown, không giải thích.

Tên tệp: ${input.fileName}

Nội dung CV:
${input.cvText}
`.trim();
}

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
- Chỉ trả về JSON theo đúng cấu trúc dưới đây. Không đổi tên field, không bọc trong field khác.

JSON bắt buộc:
{
  "profile": {
    "currentRole": string | null,
    "totalYearsExperience": number | null,
    "skills": string[],
    "languages": string[]
  },
  "summary": string,
  "evaluations": [
    {
      "criterionId": string,
      "status": "met" | "partial" | "not_met" | "unknown",
      "evidence": string[],
      "reason": string
    }
  ],
  "strengths": string[],
  "risks": string[],
  "screeningQuestions": string[]
}

Vị trí: ${input.jobTitle}

Mô tả công việc:
${input.jobDescription}

Tiêu chí chấm điểm:
${JSON.stringify(input.criteria, null, 2)}

Nội dung CV:
${input.cvText}
`.trim();
}
