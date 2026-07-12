import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { get, put } from "@vercel/blob";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export type StoredCvFile = {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
};

export type OpenedCvFile = {
  stream: Readable;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class CvStorageService {
  constructor(private readonly configService: ConfigService) {}

  async storeCandidateCv(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    if (this.shouldUseVercelBlob()) {
      return this.storeInVercelBlob(file, candidateId, applicationId);
    }

    return this.storeLocally(file, candidateId, applicationId);
  }

  async openCandidateCv(path: string, fallbackMimeType: string): Promise<OpenedCvFile> {
    if (this.isVercelBlobPath(path)) {
      const blob = await get(path, { access: "private", useCache: false });

      if (!blob || blob.statusCode !== 200) {
        throw new NotFoundException("Candidate file is missing from Vercel Blob");
      }

      return {
        stream: Readable.fromWeb(blob.stream as unknown as NodeReadableStream<Uint8Array>),
        contentType: blob.blob.contentType || fallbackMimeType,
        sizeBytes: blob.blob.size,
      };
    }

    const fileStat = await stat(path).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new NotFoundException("Candidate file is missing from storage");
    }

    return {
      stream: createReadStream(path),
      contentType: fallbackMimeType,
      sizeBytes: fileStat.size,
    };
  }

  isManagedStoragePath(path: string) {
    return this.isVercelBlobPath(path);
  }

  private shouldUseVercelBlob() {
    const driver = this.configService.get<string>("CV_STORAGE_DRIVER");
    if (driver === "local") return false;
    if (driver === "vercel-blob") return true;
    return Boolean(this.configService.get<string>("BLOB_STORE_ID") || this.configService.get<string>("BLOB_READ_WRITE_TOKEN"));
  }

  private async storeInVercelBlob(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    const pathname = `cv/${candidateId}/${applicationId}/${Date.now()}-${normalizeFilename(file.originalname)}`;
    const blob = await put(pathname, file.buffer, {
      access: "private",
      contentType: file.mimetype,
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return {
      originalName: file.originalname,
      storedName: blob.pathname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path: blob.url,
    };
  }

  private async storeLocally(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    const uploadDir = this.configService.get<string>("UPLOAD_DIR") ?? "uploads";
    const storedName = `${Date.now()}-${normalizeFilename(file.originalname)}`;
    const path = join(uploadDir, "cv", candidateId, applicationId, storedName);

    await mkdir(join(uploadDir, "cv", candidateId, applicationId), { recursive: true });
    await writeFile(path, file.buffer);

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path,
    };
  }

  private isVercelBlobPath(path: string) {
    return /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(path) || path.startsWith("cv/");
  }
}

function normalizeFilename(value: string) {
  const extension = extname(value).toLowerCase();
  const base = value
    .replace(extname(value), "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${base || "cv"}${extension}`;
}
