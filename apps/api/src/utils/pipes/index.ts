import { BadRequestException, ValidationPipe, type ValidationError } from "@nestjs/common";

const FIELD_LABELS: Record<string, string> = {
  applicationArea: "Khu vực ứng tuyển",
  answer: "Câu trả lời",
  benefits: "Phúc lợi",
  channel: "Kênh liên hệ",
  company: "Công ty",
  consentAccepted: "Xác nhận đồng ý",
  content: "Nội dung",
  department: "Phòng ban",
  description: "Mô tả công việc",
  email: "Email",
  employment: "Hình thức làm việc",
  followUpAt: "Thời gian nhắc follow-up",
  fullName: "Họ và tên",
  jobId: "ID vị trí tuyển dụng",
  label: "Câu hỏi",
  level: "Cấp bậc",
  linkedinUrl: "LinkedIn",
  locations: "Địa điểm",
  logo: "Biểu tượng",
  name: "Tên",
  note: "Ghi chú",
  noticePeriod: "Thời gian có thể nhận việc",
  phone: "Số điện thoại",
  portfolioUrl: "Liên kết CV/portfolio",
  questionAnswers: "Câu trả lời sàng lọc",
  questionId: "ID câu hỏi",
  questions: "Câu hỏi sàng lọc",
  required: "Trạng thái bắt buộc",
  requirements: "Yêu cầu công việc",
  salaryExpectation: "Mức lương mong muốn",
  salaryRange: "Khoảng lương",
  screeningAnswers: "Ghi chú ứng tuyển",
  sortOrder: "Thứ tự",
  status: "Trạng thái",
  tags: "Thẻ kỹ năng",
  title: "Tiêu đề",
  urgent: "Mức độ khẩn",
};

export function createVietnameseValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => new BadRequestException(formatValidationErrors(errors)),
  });
}

export function formatValidationErrors(errors: ValidationError[]) {
  const messages = flattenValidationErrors(errors);
  return messages.length ? messages : ["Dữ liệu gửi lên không hợp lệ."];
}

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const messages = Object.entries(error.constraints ?? {}).map(([constraint, defaultMessage]) =>
      translateValidationConstraint(error.property, constraint, defaultMessage),
    );

    return [...messages, ...flattenValidationErrors(error.children ?? [])];
  });
}

function translateValidationConstraint(property: string, constraint: string, defaultMessage: string) {
  const field = FIELD_LABELS[property] ?? property;
  const customVietnameseMessage = defaultMessage.trim();

  if (containsVietnamese(customVietnameseMessage)) {
    return customVietnameseMessage;
  }

  switch (constraint) {
    case "arrayMaxSize":
      return `${field} vượt quá số lượng cho phép.`;
    case "arrayMinSize":
      return `${field} cần có ít nhất một giá trị.`;
    case "isArray":
      return `${field} phải là danh sách.`;
    case "isBoolean":
      return `${field} phải là true hoặc false.`;
    case "isDateString":
      return `${field} phải là ngày giờ hợp lệ.`;
    case "isEmail":
      return `${field} không đúng định dạng email.`;
    case "isEnum":
    case "isIn":
      return `${field} không nằm trong danh sách cho phép.`;
    case "isInt":
      return `${field} phải là số nguyên.`;
    case "isNotEmpty":
      return `${field} không được để trống.`;
    case "isString":
      return `${field} phải là chuỗi văn bản.`;
    case "length":
      return `${field} không đúng độ dài cho phép.`;
    case "matches":
      return `${field} không đúng định dạng.`;
    case "maxLength":
      return `${field} vượt quá độ dài cho phép.`;
    case "min":
      return `${field} phải lớn hơn hoặc bằng giá trị tối thiểu.`;
    case "minLength":
      return `${field} chưa đủ độ dài tối thiểu.`;
    case "nestedValidation":
      return `${field} không hợp lệ.`;
    case "whitelistValidation":
      return "Trường dữ liệu này không được phép gửi lên.";
    default:
      return `${field} không hợp lệ.`;
  }
}

function containsVietnamese(value: string) {
  return /[À-ỹĐđ]/u.test(value);
}
