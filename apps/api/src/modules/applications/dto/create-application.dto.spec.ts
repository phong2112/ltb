import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ApplicationQuestionAnswerDto, CreateApplicationDto } from "./create-application.dto";

describe("CreateApplicationDto", () => {
  it("accepts screening question answers submitted as multipart JSON", async () => {
    const dto = plainToInstance(CreateApplicationDto, {
      jobId: "job-1",
      fullName: "Candidate",
      email: "candidate@example.com",
      phone: "0901234567",
      applicationArea: "Hà Nội",
      portfolioUrl: "https://candidate.dev/cv",
      consentAccepted: "true",
      questionAnswers: JSON.stringify([
        {
          questionId: "question-1",
          answer: "  6 years with React and Angular  ",
        },
        {
          questionId: "question-2",
          answer: "2500",
        },
      ]),
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(dto.questionAnswers?.[0]).toBeInstanceOf(ApplicationQuestionAnswerDto);
    expect(dto.questionAnswers?.map(({ questionId, answer }) => ({ questionId, answer }))).toEqual([
      {
        questionId: "question-1",
        answer: "6 years with React and Angular",
      },
      {
        questionId: "question-2",
        answer: "2500",
      },
    ]);
  });
});
