import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
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

describe("CvStorageService", () => {
  beforeEach(() => {
    jest.mocked(S3Client).mockClear();
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
