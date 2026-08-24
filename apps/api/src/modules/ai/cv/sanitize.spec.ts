import type { CvSummary } from "@/models/ai";
import { sanitizeCvSummary } from "./sanitize";

describe("sanitizeCvSummary", () => {
  it("removes isolated and visibly truncated AI fragments", () => {
    const summary: CvSummary = {
      overview: "Frontend Developer có hơn 4 năm kinh nghiệm phát triển ứng dụng web.",
      currentTitle: "Frontend D",
      totalExperience: "hơn 4",
      keySkills: ["J", "ReactJS", "React Hook F", "CSS3", "reactjs"],
      workExperiences: [
        { company: "FPT Software", title: "Frontend D", duration: "2022 - 2024" },
        { company: "Công ty N", title: null, duration: null },
      ],
      workCompanies: ["FPT Software", "Công ty N"],
      workHighlights: ["Tối ưu hiệu năng website và xây dựng CI/CD", "Landing P", "P"],
      education: ["Đại học Bách Khoa Hà N", "Khoá học lập trình web MindX"],
      languages: ["K", "Tiếng Anh (TOEIC 700+)", "Tiếng Việt"],
      notesForTa: ["K", "Nắm kiến thức về OOP, SOLID"],
    };

    expect(sanitizeCvSummary(summary)).toEqual({
      overview: "Frontend Developer có hơn 4 năm kinh nghiệm phát triển ứng dụng web.",
      currentTitle: null,
      totalExperience: null,
      keySkills: ["ReactJS", "CSS3"],
      workExperiences: [
        { company: "FPT Software", title: null, duration: "2022 - 2024" },
      ],
      workCompanies: ["FPT Software"],
      workHighlights: ["Tối ưu hiệu năng website và xây dựng CI/CD"],
      education: ["Khoá học lập trình web MindX"],
      languages: ["Tiếng Anh (TOEIC 700+)", "Tiếng Việt"],
      notesForTa: ["Nắm kiến thức về OOP, SOLID"],
    });
  });

  it("keeps complete technical names ending with symbols", () => {
    const summary: CvSummary = {
      overview: "Kỹ sư phần mềm.",
      currentTitle: "C++ Developer",
      totalExperience: "18 tháng",
      keySkills: ["C++", "C#", ".NET"],
      workCompanies: [],
      workHighlights: [],
      education: [],
      languages: [],
      notesForTa: [],
    };

    expect(sanitizeCvSummary(summary)).toMatchObject({
      currentTitle: "C++ Developer",
      totalExperience: "18 tháng",
      keySkills: ["C++", "C#", ".NET"],
    });
  });

  it("keeps complete work periods and removes lone dates", () => {
    const summary: CvSummary = {
      overview: "Kỹ sư phần mềm có kinh nghiệm tại nhiều công ty.",
      currentTitle: "Kỹ sư phần mềm",
      totalExperience: "5 năm",
      keySkills: [],
      workExperiences: [
        { company: "FPT", title: "Developer", duration: "Jan 2020 – Nov 2022" },
        { company: "TCB", title: "Developer", duration: "Nov 2025" },
        { company: "Viettel", title: "Developer", duration: "01/2023 - hiện tại" },
      ],
      workCompanies: [],
      workHighlights: [],
      education: [],
      languages: [],
      notesForTa: [],
    };

    expect(sanitizeCvSummary(summary)).toMatchObject({
      workExperiences: [
        { company: "FPT", title: "Developer", duration: "Jan 2020 – Nov 2022" },
        { company: "TCB", title: "Developer", duration: null },
        { company: "Viettel", title: "Developer", duration: "01/2023 - hiện tại" },
      ],
    });
  });
});
