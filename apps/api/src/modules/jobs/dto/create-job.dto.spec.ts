import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateJobDto } from "./create-job.dto";

jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value,
}));

describe("CreateJobDto", () => {
  it("accepts screening questions when creating a job", async () => {
    const dto = plainToInstance(CreateJobDto, {
      title: "Senior React Engineer",
      company: "Acme Vietnam",
      locations: ["Hà Nội"],
      employment: "Full-time",
      level: "Senior",
      salaryRange: null,
      tags: ["React", "TypeScript"],
      description:
        "<p>Build candidate-facing and TA-facing product workflows with stable UI and clear backend integration.</p>",
      requirements:
        "<p>Strong React TypeScript experience and clear communication across product and engineering teams.</p>",
      benefits: "<p>Competitive benefits.</p>",
      status: "DRAFT",
      urgent: false,
      logo: "💻",
      questions: [
        {
          label: "How many years of React experience do you have?",
          required: true,
          sortOrder: 0,
        },
      ],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(dto.questions).toEqual([
      {
        label: "How many years of React experience do you have?",
        required: true,
        sortOrder: 0,
      },
    ]);
  });
});
