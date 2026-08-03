jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import { buildInlineContentDisposition } from "./index.controller";

describe("CandidatesController helpers", () => {
  it("builds a Content-Disposition header that supports Vietnamese filenames", () => {
    const header = buildInlineContentDisposition("CV ứng viên Nguyễn Văn A.pdf");

    expect(header).toContain('inline; filename="CV ung vien Nguyen Van A.pdf"');
    expect(header).toContain("filename*=UTF-8''CV%20%E1%BB%A9ng%20vi%C3%AAn%20Nguy%E1%BB%85n%20V%C4%83n%20A.pdf");
    expect([...header].every(char => char.charCodeAt(0) <= 0x7f)).toBe(true);
  });

  it("removes header-breaking characters from the ASCII fallback filename", () => {
    const header = buildInlineContentDisposition('bad"name\\with\r\nbreak.pdf');

    expect(header).toContain('filename="bad_name_with__break.pdf"');
  });
});
