import { ArgumentsHost, HttpStatus, NotFoundException } from "@nestjs/common";
import { VietnameseExceptionFilter } from "./vietnamese-exception.filter";

describe("VietnameseExceptionFilter", () => {
  it("translates default Nest HTTP messages", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new VietnameseExceptionFilter().catch(
      new NotFoundException("Cannot GET /missing"),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Không tìm thấy tài nguyên được yêu cầu.",
      error: "Không tìm thấy",
    });
  });
});
