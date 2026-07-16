import type { ValidationError } from "@nestjs/common";
import { formatValidationErrors } from "./vietnamese-validation.pipe";

describe("formatValidationErrors", () => {
  it("formats class-validator errors in Vietnamese", () => {
    const errors: ValidationError[] = [
      {
        property: "email",
        constraints: {
          isEmail: "email must be an email",
        },
      },
      {
        property: "questionAnswers",
        children: [
          {
            property: "answer",
            constraints: {
              maxLength: "answer must be shorter than or equal to 1000 characters",
            },
          },
        ],
      },
      {
        property: "unexpected",
        constraints: {
          whitelistValidation: "property unexpected should not exist",
        },
      },
    ];

    expect(formatValidationErrors(errors)).toEqual([
      "Email không đúng định dạng email.",
      "Câu trả lời vượt quá độ dài cho phép.",
      "Trường dữ liệu này không được phép gửi lên.",
    ]);
  });
});
