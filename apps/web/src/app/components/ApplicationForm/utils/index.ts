import { isAllowedCvExtension, isAllowedCvMimeType, maxScreeningAnswerLength } from "@hr-copilot/shared";
import { MAX_CV_FILE_SIZE_BYTES } from "../constants";
import type { ScreeningQuestion, Translate } from "../types";

export function getMeaningfulAnswerLength(value: string) {
  return value.trim().replace(/\s+/gu, " ").length;
}

export function getScreeningAnswerError(question: ScreeningQuestion, value: string) {
  const answerLength = getMeaningfulAnswerLength(value);

  if (question.required && answerLength === 0) {
    return "Vui lòng trả lời câu hỏi bắt buộc";
  }

  if (answerLength > maxScreeningAnswerLength) {
    return `Câu trả lời tối đa ${maxScreeningAnswerLength} ký tự nội dung`;
  }

  return "";
}

export function validateCvFile(file: File, t: Translate) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    !isAllowedCvExtension(extension) ||
    (file.type !== "" && !isAllowedCvMimeType(file.type))
  ) {
    return t("apply.cvTypeError");
  }

  if (file.size > MAX_CV_FILE_SIZE_BYTES) {
    return t("apply.cvSizeError");
  }

  return "";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
