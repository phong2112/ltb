import { Document, Packer, Paragraph, TextRun } from "docx";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const FIXTURE_DIR = join(process.cwd(), "test", "fixtures", "cv-eval");
const CV_LINES = [
  "NGUYEN VAN EVAL",
  "Frontend Engineer",
  "Email: eval.candidate@example.com",
  "Phone: 0901234567",
  "Four years building accessible web applications.",
  "Skills: React, TypeScript, Node.js, REST API, Jest, PostgreSQL.",
  "Experience: Delivered recruitment and commerce products.",
  "English: professional working proficiency.",
];

void main();

async function main() {
  await mkdir(FIXTURE_DIR, { recursive: true });

  const cvJpeg = await createCvJpeg(CV_LINES);
  await Promise.all([
    writeFile(join(FIXTURE_DIR, "image.jpg"), cvJpeg),
    writeFile(join(FIXTURE_DIR, "pdf-text.pdf"), await createTextPdf()),
    writeFile(join(FIXTURE_DIR, "pdf-scan.pdf"), await createScanPdf(cvJpeg)),
    writeFile(join(FIXTURE_DIR, "pdf-hybrid.pdf"), await createHybridPdf(cvJpeg)),
    writeFile(join(FIXTURE_DIR, "pdf-multipage.pdf"), await createMultipagePdf(cvJpeg)),
    writeFile(join(FIXTURE_DIR, "docx.docx"), await createDocx()),
  ]);

  console.log(`Generated fictional CV fixtures in ${FIXTURE_DIR}`);
}

async function createCvJpeg(lines: string[]) {
  const lineMarkup = lines.map((line, index) => (
    `<text x="70" y="${130 + index * 90}" font-family="Arial, sans-serif" font-size="${index === 0 ? 42 : 30}" fill="#111827">${escapeXml(line)}</text>`
  )).join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600">
      <rect width="1200" height="1600" fill="#ffffff"/>
      <rect x="40" y="40" width="1120" height="1520" fill="none" stroke="#c85b7a" stroke-width="5"/>
      ${lineMarkup}
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function createTextPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const expandedLines = [
    ...CV_LINES,
    "Projects: Design systems, application intake, CV review, candidate workflows.",
    "Responsibilities: UI delivery, API integration, testing, code review, mentoring.",
    "Education: Bachelor of Software Engineering. Available for full-time work.",
  ];
  expandedLines.forEach((line, index) => {
    page.drawText(line, {
      x: 45,
      y: 790 - index * 45,
      size: index === 0 ? 20 : 12,
      font,
      color: rgb(0.08, 0.1, 0.14),
    });
  });
  return document.save();
}

async function createScanPdf(jpeg: Buffer) {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const image = await document.embedJpg(jpeg);
  page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  return document.save();
}

async function createHybridPdf(jpeg: Buffer) {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("NGUYEN VAN EVAL - CV HEADER", { x: 45, y: 810, size: 14, font });
  const image = await document.embedJpg(jpeg);
  page.drawImage(image, { x: 30, y: 20, width: 535, height: 750 });
  return document.save();
}

async function createMultipagePdf(jpeg: Buffer) {
  const document = await PDFDocument.create();
  const image = await document.embedJpg(jpeg);
  for (let pageNumber = 1; pageNumber <= 12; pageNumber += 1) {
    const page = document.addPage([595, 842]);
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }
  return document.save();
}

async function createDocx() {
  const document = new Document({
    sections: [{
      children: CV_LINES.concat([
        "Projects: Design systems, candidate intake and CV review workflows.",
        "Responsibilities: API integration, testing, code review and mentoring.",
      ]).map((line, index) => new Paragraph({
        children: [new TextRun({ text: line, bold: index === 0, size: index === 0 ? 34 : 24 })],
      })),
    }],
  });
  return Packer.toBuffer(document);
}

function escapeXml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}
