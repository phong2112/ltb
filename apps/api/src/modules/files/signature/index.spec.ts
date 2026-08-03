import { hasAllowedFileSignature } from ".";

describe("hasAllowedFileSignature", () => {
  it("accepts supported files whose extension matches their magic bytes", () => {
    expect(hasAllowedFileSignature(file("candidate.pdf", Buffer.from("\n%PDF-1.7")))).toBe(true);
    expect(hasAllowedFileSignature(file("candidate.docx", Buffer.from([0x50, 0x4b, 0x03, 0x04])))).toBe(true);
    expect(hasAllowedFileSignature(file("candidate.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).toBe(true);
  });

  it("rejects spoofed and unsupported files", () => {
    expect(hasAllowedFileSignature(file("candidate.pdf", Buffer.from("MZ%PDF-1.7")))).toBe(false);
    expect(hasAllowedFileSignature(file("candidate.txt", Buffer.from("plain text")))).toBe(false);
  });
});

function file(originalname: string, buffer: Buffer) {
  return { originalname, buffer } as Express.Multer.File;
}
