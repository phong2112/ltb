import { extname } from "node:path";

/**
 * Validates that an uploaded file's magic bytes match its extension.
 * Shared by the public application intake flow and the TA talent-pool upload flow.
 */
export function hasAllowedFileSignature(file: Express.Multer.File) {
  const extension = extname(file.originalname).toLowerCase();

  if (extension === ".pdf") {
    return hasPdfSignature(file.buffer);
  }

  const bytes = file.buffer.subarray(0, 8);

  if (extension === ".doc") {
    return bytes.length >= 8 && bytes.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }

  if (extension === ".docx") {
    const zipSignature = bytes.subarray(0, 4);
    return zipSignature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || zipSignature.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) || zipSignature.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]));
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (extension === ".png") {
    return bytes.length >= 8 && bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return false;
}

function hasPdfSignature(buffer: Buffer) {
  const prefix = buffer.subarray(0, 1024);
  let offset = prefix.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? 3 : 0;

  while (offset < prefix.length && isPdfWhitespace(prefix[offset])) {
    offset += 1;
  }

  return prefix.subarray(offset, offset + 5).equals(Buffer.from("%PDF-", "ascii"));
}

function isPdfWhitespace(byte: number) {
  return byte === 0x00 || byte === 0x09 || byte === 0x0a || byte === 0x0c || byte === 0x0d || byte === 0x20;
}
