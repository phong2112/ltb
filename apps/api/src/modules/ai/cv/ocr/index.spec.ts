import type { ConfigService } from "@nestjs/config";
import { createWorker } from "tesseract.js";
import { CvOcrService } from "./index.service";

const mockGetInfo = jest.fn();
const mockGetScreenshot = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getInfo: mockGetInfo,
    getScreenshot: mockGetScreenshot,
    destroy: mockDestroy,
  })),
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
  OEM: { LSTM_ONLY: 1 },
}));

describe("CvOcrService", () => {
  const services: CvOcrService[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(services.splice(0).map((service) => service.onModuleDestroy()));
  });

  it("reuses one worker across OCR requests and terminates it on shutdown", async () => {
    const worker = createWorkerMock();
    jest.mocked(createWorker).mockResolvedValue(worker);
    const service = createService();

    await service.recognizeImage(Buffer.from("page-1"));
    await service.recognizeImage(Buffer.from("page-2"));

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.setParameters).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(2);

    await service.onModuleDestroy();
    services.splice(services.indexOf(service), 1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("serializes recognize calls made against the shared worker", async () => {
    let resolveFirst!: (value: ReturnType<typeof recognizeResult>) => void;
    const firstResult = new Promise<ReturnType<typeof recognizeResult>>((resolve) => {
      resolveFirst = resolve;
    });
    const worker = createWorkerMock();
    worker.recognize
      .mockImplementationOnce(() => firstResult)
      .mockResolvedValueOnce(recognizeResult("second page", 88));
    jest.mocked(createWorker).mockResolvedValue(worker);
    const service = createService();

    const first = service.recognizeImage(Buffer.from("page-1"));
    await waitFor(() => worker.recognize.mock.calls.length === 1);
    const second = service.recognizeImage(Buffer.from("page-2"));
    await new Promise((resolve) => setImmediate(resolve));

    expect(worker.recognize).toHaveBeenCalledTimes(1);
    resolveFirst(recognizeResult("first page", 90));
    await expect(first).resolves.toMatchObject({ text: "first page" });
    await expect(second).resolves.toMatchObject({ text: "second page" });
    expect(worker.recognize).toHaveBeenCalledTimes(2);
  });

  it("OCRs only the configured leading pages and reports truncation", async () => {
    mockGetInfo.mockResolvedValue({ total: 12 });
    mockGetScreenshot.mockResolvedValue({
      pages: Array.from({ length: 10 }, (_, index) => ({ data: Buffer.from(`page-${index + 1}`) })),
    });
    const worker = createWorkerMock();
    jest.mocked(createWorker).mockResolvedValue(worker);
    const service = createService({ OCR_MAX_PAGES: 10 });

    await expect(service.recognizePdf(Buffer.from("pdf"))).resolves.toMatchObject({
      pages: 10,
      totalPages: 12,
      truncatedPages: true,
    });
    expect(mockGetScreenshot).toHaveBeenCalledWith(expect.objectContaining({ first: 10 }));
    expect(worker.recognize).toHaveBeenCalledTimes(10);
  });

  it("discards a failed worker so the next request creates a clean one", async () => {
    const failedWorker = createWorkerMock();
    failedWorker.recognize.mockRejectedValueOnce(new Error("worker crashed"));
    const replacementWorker = createWorkerMock();
    jest.mocked(createWorker)
      .mockResolvedValueOnce(failedWorker)
      .mockResolvedValueOnce(replacementWorker);
    const service = createService();

    await expect(service.recognizeImage(Buffer.from("bad"))).rejects.toThrow("worker crashed");
    await expect(service.recognizeImage(Buffer.from("good"))).resolves.toMatchObject({
      text: "recognized text",
    });

    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(failedWorker.terminate).toHaveBeenCalledTimes(1);
  });

  function createService(values: Record<string, number> = {}) {
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    const service = new CvOcrService(config);
    services.push(service);
    return service;
  }
});

function createWorkerMock() {
  return {
    setParameters: jest.fn().mockResolvedValue({}),
    recognize: jest.fn().mockResolvedValue(recognizeResult("recognized text", 90)),
    terminate: jest.fn().mockResolvedValue({}),
  } as unknown as Awaited<ReturnType<typeof createWorker>> & {
    setParameters: jest.Mock;
    recognize: jest.Mock;
    terminate: jest.Mock;
  };
}

function recognizeResult(text: string, confidence: number) {
  return { data: { text, confidence } };
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for test condition");
}
