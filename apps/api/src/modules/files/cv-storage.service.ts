import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { del, get, put } from "@vercel/blob";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
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

type StorageDriver = "local" | "vercel-blob" | "r2";

type R2StorageConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

@Injectable()
export class CvStorageService {
  private r2Client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  async storeCandidateCv(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    const driver = this.getStorageDriver();

    if (driver === "r2") {
      return this.storeInR2(file, candidateId, applicationId);
    }

    if (driver === "local") {
      return this.storeLocally(file, candidateId, applicationId);
    }

    return this.storeInVercelBlob(file, candidateId, applicationId);
  }

  async openCandidateCv(path: string, fallbackMimeType: string): Promise<OpenedCvFile> {
    if (this.isR2Path(path)) {
      return this.openR2Object(path, fallbackMimeType);
    }

    if (this.isVercelBlobPath(path)) {
      const blob = await get(path, { access: "private", useCache: false });

      if (!blob || blob.statusCode !== 200) {
        throw new NotFoundException("Không tìm thấy tệp CV trong kho lưu trữ.");
      }

      return {
        stream: Readable.fromWeb(blob.stream as unknown as NodeReadableStream<Uint8Array>),
        contentType: blob.blob.contentType || fallbackMimeType,
        sizeBytes: blob.blob.size,
      };
    }

    const fileStat = await stat(path).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new NotFoundException("Không tìm thấy tệp CV trong kho lưu trữ.");
    }

    return {
      stream: createReadStream(path),
      contentType: fallbackMimeType,
      sizeBytes: fileStat.size,
    };
  }

  async deleteCandidateCv(path: string) {
    if (this.isR2Path(path)) {
      const { bucket, key } = parseR2Path(path);
      await this.getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return;
    }

    if (this.isVercelBlobPath(path)) {
      await del(path);
      return;
    }

    await unlink(path).catch((error: unknown) => {
      if (!isMissingFileError(error)) throw error;
    });
  }

  isManagedStoragePath(path: string) {
    return this.isR2Path(path) || this.isVercelBlobPath(path);
  }

  private getStorageDriver(): StorageDriver {
    const driver = this.configService.get<string>("CV_STORAGE_DRIVER");
    if (driver === "local" || driver === "vercel-blob" || driver === "r2") return driver;
    return "r2";
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
      path: blob.pathname,
    };
  }

  private async storeLocally(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    const uploadDir = this.configService.get<string>("UPLOAD_DIR") ?? "uploads";
    const storedName = `${Date.now()}-${normalizeFilename(file.originalname)}`;
    const path = join(uploadDir, "cv", candidateId, applicationId, storedName);

    await mkdir(join(uploadDir, "cv", candidateId, applicationId), {
      recursive: true,
    });
    await writeFile(path, file.buffer);

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path,
    };
  }

  private async storeInR2(file: Express.Multer.File, candidateId: string, applicationId: string): Promise<StoredCvFile> {
    const { bucket } = this.getR2Config();
    const key = `cv/${candidateId}/${applicationId}/${Date.now()}-${normalizeFilename(file.originalname)}`;

    await this.getR2Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return {
      originalName: file.originalname,
      storedName: key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path: buildR2Path(bucket, key),
    };
  }

  private async openR2Object(path: string, fallbackMimeType: string): Promise<OpenedCvFile> {
    const { bucket, key } = parseR2Path(path);

    try {
      const response = await this.getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = response.Body;

      if (!body) {
        throw new NotFoundException("Không tìm thấy tệp CV trong kho lưu trữ.");
      }

      return {
        stream: toNodeReadable(body),
        contentType: response.ContentType || fallbackMimeType,
        sizeBytes: response.ContentLength ?? 0,
      };
    } catch (error: unknown) {
      if (isObjectNotFoundError(error)) {
        throw new NotFoundException("Không tìm thấy tệp CV trong kho lưu trữ.");
      }

      throw error;
    }
  }

  private getR2Client() {
    if (this.r2Client) return this.r2Client;

    const config = this.getR2Config();
    this.r2Client = new S3Client({
      endpoint: config.endpoint,
      region: "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return this.r2Client;
  }

  private getR2Config(): R2StorageConfig {
    const endpointOrAccountId = getFirstConfigValue(this.configService, [
      "R2_ENDPOINT",
      "STORAGE_ENDPOINT",
      "S3_API",
      "CLOUD_FLARE_STORAGE_ACCOUNT_ID",
      "CLOUDFLARE_R2_ACCOUNT_ID",
    ]);
    const bucket = getFirstConfigValue(this.configService, [
      "R2_BUCKET",
      "R2_BUCKET_NAME",
      "STORAGE_BUCKET",
      "S3_BUCKET",
      "S3_BUCKET_NAME",
      "s3_BUCKET",
      "s3_BUCKET_NAME",
    ]);
    const accessKeyId = getFirstConfigValue(this.configService, [
      "R2_ACCESS_KEY_ID",
      "STORAGE_ACCESS_KEY_ID",
      "S3_ACCESS_KEY_ID",
      "s3_ACCESS_KEY",
    ]);
    const secretAccessKey = getFirstConfigValue(this.configService, [
      "R2_SECRET_ACCESS_KEY",
      "STORAGE_SECRET_ACCESS_KEY",
      "S3_SECRET_ACCESS_KEY",
      "s3_SECRET_ACCESS_KEY",
      "S3_SECRET_KEY",
      "s3_SECRET_KEY",
    ]);

    if (!endpointOrAccountId || !bucket || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException("Thiếu cấu hình Cloudflare R2 cho lưu trữ CV.");
    }

    return {
      endpoint: normalizeR2Endpoint(endpointOrAccountId),
      bucket,
      accessKeyId,
      secretAccessKey,
    };
  }

  private isR2Path(path: string) {
    return path.startsWith("r2://");
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

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function getFirstConfigValue(configService: ConfigService, keys: string[]) {
  for (const key of keys) {
    const value = configService.get<string>(key);
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
}

function normalizeR2Endpoint(value: string) {
  const trimmed = value.trim().replace(/\/+$/g, "");
  if (/^https?:\/\//.test(trimmed)) return trimmed;

  return `https://${trimmed}.r2.cloudflarestorage.com`;
}

function buildR2Path(bucket: string, key: string) {
  return `r2://${bucket}/${key}`;
}

function parseR2Path(path: string) {
  const match = /^r2:\/\/([^/]+)\/(.+)$/.exec(path);
  if (!match) {
    throw new NotFoundException("Đường dẫn tệp CV không hợp lệ.");
  }

  return {
    bucket: match[1],
    key: match[2],
  };
}

function toNodeReadable(body: NonNullable<GetObjectCommandOutput["Body"]>) {
  if (body instanceof Readable) return body;

  if ("transformToWebStream" in body && typeof body.transformToWebStream === "function") {
    return Readable.fromWeb(body.transformToWebStream() as NodeReadableStream<Uint8Array>);
  }

  if (Symbol.asyncIterator in body) {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }

  throw new InternalServerErrorException("Không thể đọc luồng tệp CV từ kho lưu trữ.");
}

function isObjectNotFoundError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const metadata = "$metadata" in error
    ? error.$metadata as { httpStatusCode?: number }
    : undefined;

  return error.name === "NoSuchKey" || error.name === "NotFound" || metadata?.httpStatusCode === 404;
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
