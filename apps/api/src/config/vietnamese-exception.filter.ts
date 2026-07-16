import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

const HTTP_ERROR_LABELS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: "Yêu cầu không hợp lệ",
  [HttpStatus.UNAUTHORIZED]: "Chưa xác thực",
  [HttpStatus.FORBIDDEN]: "Không có quyền truy cập",
  [HttpStatus.NOT_FOUND]: "Không tìm thấy",
  [HttpStatus.CONFLICT]: "Dữ liệu bị trùng",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "Dữ liệu gửi lên quá lớn",
  [HttpStatus.TOO_MANY_REQUESTS]: "Gửi yêu cầu quá nhanh",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Lỗi hệ thống",
};

const DEFAULT_MESSAGES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: "Dữ liệu gửi lên không hợp lệ.",
  [HttpStatus.UNAUTHORIZED]: "Vui lòng đăng nhập lại.",
  [HttpStatus.FORBIDDEN]: "Bạn không có quyền thực hiện thao tác này.",
  [HttpStatus.NOT_FOUND]: "Không tìm thấy tài nguyên được yêu cầu.",
  [HttpStatus.CONFLICT]: "Dữ liệu đã tồn tại hoặc bị trùng.",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "Dữ liệu gửi lên vượt quá dung lượng cho phép.",
  [HttpStatus.TOO_MANY_REQUESTS]: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
};

@Catch()
export class VietnameseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(VietnameseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = (exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR) as HttpStatus;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const messages = normalizeMessages(extractMessage(exceptionResponse), status);

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      message: messages.length === 1 ? messages[0] : messages,
      error: HTTP_ERROR_LABELS[status] ?? "Lỗi yêu cầu",
    });
  }
}

function extractMessage(response: unknown): string[] {
  if (typeof response === "string") return [response];
  if (!response || typeof response !== "object" || Array.isArray(response)) return [];

  const message = (response as Record<string, unknown>).message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  return typeof message === "string" && message.trim() ? [message] : [];
}

function normalizeMessages(messages: string[], status: HttpStatus) {
  const normalized = messages
    .map(message => translateDefaultHttpMessage(message, status))
    .filter((message): message is string => Boolean(message));

  return normalized.length ? normalized : [DEFAULT_MESSAGES[status] ?? "Yêu cầu không xử lý được."];
}

function translateDefaultHttpMessage(message: string, status: HttpStatus) {
  const trimmed = message.trim();

  if (!trimmed || /^Cannot\s+/u.test(trimmed)) {
    return DEFAULT_MESSAGES[status];
  }

  const lower = trimmed.toLowerCase();
  if (lower === "bad request") return DEFAULT_MESSAGES[HttpStatus.BAD_REQUEST];
  if (lower === "unauthorized") return DEFAULT_MESSAGES[HttpStatus.UNAUTHORIZED];
  if (lower === "forbidden") return DEFAULT_MESSAGES[HttpStatus.FORBIDDEN];
  if (lower === "not found") return DEFAULT_MESSAGES[HttpStatus.NOT_FOUND];
  if (lower === "conflict") return DEFAULT_MESSAGES[HttpStatus.CONFLICT];
  if (lower === "payload too large") return DEFAULT_MESSAGES[HttpStatus.PAYLOAD_TOO_LARGE];
  if (lower === "too many requests") return DEFAULT_MESSAGES[HttpStatus.TOO_MANY_REQUESTS];
  if (lower === "internal server error") return DEFAULT_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR];

  return trimmed;
}
