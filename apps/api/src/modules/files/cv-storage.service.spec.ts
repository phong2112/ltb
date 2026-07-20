import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { get, put } from "@vercel/blob";
import { Readable } from "node:stream";
import { CvStorageService } from "./cv-storage.service";

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

jest.mock("@vercel/blob", () => ({
  del: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
}));

describe("CvStorageService", () => {
  beforeEach(() => {
    jest.mocked(S3Client).mockClear();
    jest.mocked(get).mockReset();
    jest.mocked(put).mockReset();
  });

  it("stores new CV files in Cloudflare R2 when the R2 driver is enabled", async () => {
    const service = new CvStorageService(createConfigService({
      CV_STORAGE_DRIVER: "r2",
      R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      R2_BUCKET: "candidate-cvs",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "secret-access-key",
    }));
    const file = {
      originalname: "Nguyen Van A CV.pdf",
      mimetype: "application/pdf",
      size: 4,
      buffer: Buffer.from("%PDF"),
    } as Express.Multer.File;

    const stored = await service.storeCandidateCv(file, "candidate-1", "application-1");
    const s3Client = getMockedS3Client();

    expect(stored).toMatchObject({
      originalName: "Nguyen Van A CV.pdf",
      storedName: expect.stringMatching(/^cv\/candidate-1\/application-1\/\d+-Nguyen-Van-A-CV\.pdf$/),
      mimeType: "application/pdf",
      sizeBytes: 4,
      path: expect.stringMatching(/^r2:\/\/candidate-cvs\/cv\/candidate-1\/application-1\/\d+-Nguyen-Van-A-CV\.pdf$/),
    });
    expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "https://account-id.r2.cloudflarestorage.com",
      region: "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: "access-key-id",
        secretAccessKey: "secret-access-key",
      },
    }));
    expect(s3Client.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "candidate-cvs",
      Key: stored.storedName,
      Body: file.buffer,
      ContentType: "application/pdf",
    });
  });

  it("treats legacy Vercel Blob paths and new R2 paths as managed storage paths", () => {
    const service = new CvStorageService(createConfigService({ CV_STORAGE_DRIVER: "r2" }));

    expect(service.isManagedStoragePath("cv/candidate-1/application-1/candidate.pdf")).toBe(true);
    expect(service.isManagedStoragePath("r2://candidate-cvs/cv/candidate-1/application-1/candidate.pdf")).toBe(true);
    expect(service.isManagedStoragePath("https://example.com/candidate.pdf")).toBe(false);
  });

  it("copies an R2 CV to the private Vercel Blob archive tier", async () => {
    const send = jest.fn().mockResolvedValueOnce({
      Body: Readable.from(Buffer.from("%PDF")),
      ContentType: "application/pdf",
      ContentLength: 4,
    });
    jest.mocked(S3Client).mockImplementationOnce(() => ({ send }) as never);
    const service = new CvStorageService(createConfigService({
      CV_STORAGE_DRIVER: "r2",
      R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      R2_BUCKET: "candidate-cvs",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "secret-access-key",
    }));
    jest.mocked(put).mockResolvedValue({
      pathname: "archive/cv/candidate-1/application-1/candidate.pdf",
    } as never);

    const archived = await service.archiveCandidateCv({
      path: "r2://candidate-cvs/cv/candidate-1/application-1/candidate.pdf",
      storedName: "cv/candidate-1/application-1/candidate.pdf",
      originalName: "candidate.pdf",
      mimeType: "application/pdf",
      candidateId: "candidate-1",
      applicationId: "application-1",
    });

    expect(archived.path).toMatch(/^archive\/cv\/candidate-1\/application-1\//);
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^archive\/cv\/candidate-1\/application-1\/\d+-candidate\.pdf$/),
      expect.any(Readable),
      expect.objectContaining({ access: "private", contentType: "application/pdf" }),
    );
  });

  it("copies an archived Vercel Blob CV back to the R2 primary tier", async () => {
    const service = new CvStorageService(createConfigService({
      CV_STORAGE_DRIVER: "r2",
      R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      R2_BUCKET: "candidate-cvs",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "secret-access-key",
    }));
    jest.mocked(get).mockResolvedValue({
      statusCode: 200,
      stream: Readable.toWeb(Readable.from(Buffer.from("%PDF"))),
      blob: {
        contentType: "application/pdf",
        size: 4,
      },
    } as never);

    const restored = await service.restoreCandidateCv({
      path: "archive/cv/candidate-1/application-1/candidate.pdf",
      storedName: "archive/cv/candidate-1/application-1/candidate.pdf",
      originalName: "candidate.pdf",
      mimeType: "application/pdf",
      candidateId: "candidate-1",
      applicationId: "application-1",
    });
    const s3Client = getMockedS3Client();

    expect(restored.path).toMatch(/^r2:\/\/candidate-cvs\/cv\/candidate-1\/application-1\//);
    expect(s3Client.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "candidate-cvs",
      Key: restored.storedName,
      ContentLength: 4,
      ContentType: "application/pdf",
    });
  });
});

function createConfigService(values: Record<string, string>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function getMockedS3Client() {
  const result = jest.mocked(S3Client).mock.results[0];
  return result.value as unknown as { send: jest.Mock };
}
