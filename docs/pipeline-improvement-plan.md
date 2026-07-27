# Cải tiến pipeline AI / OCR / Parse / Scoring — Kế hoạch chi tiết (handoff)

> **THỨ TỰ THỰC THI:** Làm **XONG** tài liệu này **TRƯỚC**, rồi mới triển khai
> [talent-pool-implementation-plan.md](./talent-pool-implementation-plan.md). Lý do:
> talent pool đi qua cùng extractor + OCR; các cải tiến #1/#2/#3 dưới đây de-risk trực
> tiếp cho tính năng bulk upload sắp làm.
>
> **Mục đích tài liệu:** đủ chi tiết để một agent/dev **chưa có ngữ cảnh** thực thi.
> Đường dẫn/số dòng tham chiếu repo tại thời điểm viết (`feature/ai-agent`); nếu lệch,
> tìm theo tên hàm.

> **Trạng thái triển khai (2026-07-23): HOÀN THÀNH.** Đã triển khai eval harness,
> worker reuse + serialization/reset, PDF truncation, hybrid-PDF heuristic,
> confidence metadata/cảnh báo, criteria tiếng Việt/prose, JSON repair một lần,
> structured failure logs và health counters. Cách chạy eval nằm tại
> [cv-pipeline-evaluation.md](./cv-pipeline-evaluation.md).

---

## 0. Context & nguyên tắc

Pipeline hiện tại (đã hoạt động, code tốt) nằm ở `apps/api/src/modules/ai`:
- `cv-text-extractor.service.ts` — cascade parser→OCR (pdf-parse / mammoth / word-extractor / tesseract).
- `cv-ocr.service.ts` — tesseract.js (`vie`+`eng`), OCR ảnh & PDF-scan.
- `ollama-ai.provider.ts` — gọi Ollama `chat` với structured output (Zod schema).
- `match-scoring.ts` — trích criteria từ JD + tính score/confidence.
- `ai.service.ts` — điều phối extract → analyze, ghi `CvParseResult`/`MatchResult`.
- `ai-queue.service.ts` — BullMQ 2 queue `cv-extraction → ai-cv-match`.

**Nguyên tắc khi cải tiến:**
1. **Không đổi hợp đồng dữ liệu** đang lưu (`CvParseResult.structuredData`, `MatchResult`) theo hướng phá vỡ — chỉ thêm field.
2. **Không giảm** khả năng chịu lỗi hiện có (fallback khi AI tắt/lỗi phải giữ nguyên).
3. Mỗi thay đổi phải **có test** và **đo được** (xem #8 eval harness — nên làm sớm để đo #2/#4).
4. Giữ **backward-compatible** cho rolling deploy (không có breaking migration; các field mới trong JSON là optional).
5. Tránh over-engineer cho volume thấp: KHÔNG làm token-accounting động, đổi model lớn, hệ trọng số phức tạp.

**Thứ tự nội bộ khuyến nghị:** #8 (eval harness) → #1 → #3 → #2 → #6 → #4 → #5 → #7.
Làm #8 trước để có thước đo trước/sau cho #2 và #4.

---

## #8. Bộ đánh giá chất lượng (eval harness) — LÀM ĐẦU TIÊN

**Vì sao:** không có thước đo thì không biết #2/#4 có cải thiện thật hay không.

**Việc làm:**
- Tạo thư mục fixtures: `apps/api/test/fixtures/cv-eval/` gồm vài CV mẫu đại diện:
  `pdf-text.pdf`, `pdf-scan.pdf` (scan/ảnh), `pdf-hybrid.pdf` (header text + thân ảnh),
  `docx.docx`, `image.jpg`, `pdf-multipage.pdf` (> OCR_MAX_PAGES). Kèm 1 file kỳ vọng
  `expected.json`: cho mỗi CV ghi `{ email, phone, fullNameContains, minChars, expectCriteriaCoverage }`.
- Tạo script `apps/api/scripts/eval-cv-pipeline.ts` (chạy tay, KHÔNG vào CI vì cần Ollama + fixtures thật):
  - Chạy `CvTextExtractorService.extract` cho từng fixture, đo: parser dùng, số ký tự,
    OCR confidence, có bắt được email/phone kỳ vọng không (dùng regex parser của talent pool nếu đã có, hoặc regex tạm).
  - Nếu `AI_PROVIDER=ollama`: chạy `analyzeMatch` với một JD mẫu, đo số criteria, score, tỉ lệ evaluation `unknown`.
  - In bảng kết quả + tổng hợp (pass/fail theo `expected.json`).
- Thêm script vào `apps/api/package.json`: `"eval:cv": "ts-node scripts/eval-cv-pipeline.ts"` (hoặc tsx).
- Ghi cách chạy vào `docs/` (mục cuối tài liệu này).

**Files:** `apps/api/scripts/eval-cv-pipeline.ts`, `apps/api/test/fixtures/cv-eval/*`, `apps/api/package.json`.
**Rủi ro:** thấp (chỉ công cụ đo, không đụng runtime). Fixtures nên là CV giả/ẩn danh, KHÔNG dùng CV thật của ứng viên.

---

## #1. OCR: tái sử dụng worker (thay vì tạo mới mỗi lần) — `cv-ocr.service.ts`

**Vấn đề:** `recognizeImages` (:54-97) tạo `createWorker(...)` **mỗi lần gọi** với
`cacheMethod:"none"` (:61-65) rồi `terminate()` cuối hàm. Mỗi CV scan = 1 lần spin-up +
nạp lại model → chậm và tốn CPU/RAM. Bulk upload (talent pool) sẽ khuếch đại vấn đề.

**Thay đổi:**
- Giữ **một worker dùng lại** ở cấp service: `private workerPromise?: Promise<Worker>`.
  `getWorker()` lazy-tạo (dùng `createWorker(OCR_LANGUAGES.join("+"), OEM.LSTM_ONLY, { langPath })`,
  `setParameters` một lần) và cache. `recognizeImages` dùng worker này, **KHÔNG** terminate sau mỗi lần.
- **Serialize** các lần `worker.recognize` bằng một mutex đơn giản (promise-chain) — Tesseract
  worker KHÔNG an toàn khi gọi `recognize` song song trên cùng worker. (Match concurrency mặc định 1,
  nhưng pool-extraction concurrency có thể > 1 → bắt buộc serialize hoặc dùng pool nhỏ.)
- Thêm `implements OnModuleDestroy` → `terminate()` worker khi shutdown.
- Cân nhắc: nếu muốn song song thật, làm **pool N worker** (N = `OCR_WORKER_POOL_SIZE`, default 1).
  V1 khuyến nghị: **1 worker + mutex** (đơn giản, đủ cho volume thấp), để pool lại sau.
- Giữ `prepareOcrLanguages()` (:100-122) — đã cache đúng bằng `languagePathPromise`.

**Files:** `apps/api/src/modules/ai/cv-ocr.service.ts` (+ spec). Thêm `OCR_WORKER_POOL_SIZE` (optional) vào `env.validation.ts` nếu làm pool.
**Tests:** mock `tesseract.js` `createWorker` → assert chỉ tạo 1 worker cho nhiều lần recognize; assert serialize (không gọi recognize chồng); assert terminate khi onModuleDestroy.
**Rủi ro:** trung bình — worker sống lâu giữ RAM; mutex sai → deadlock. Test kỹ. Đảm bảo lỗi 1 trang không làm hỏng worker cho trang/CV sau (nếu worker vào trạng thái lỗi, tạo lại).

---

## #3. OCR: PDF nhiều trang — OCR N trang đầu thay vì fail toàn bộ — `cv-ocr.service.ts`

**Vấn đề:** `recognizePdf` (:35-37) `throw` khi `info.total > maxPages` → CV kèm portfolio
nhiều trang hỏng hoàn toàn.

**Thay đổi:**
- Thay vì throw: OCR `const pages = Math.min(info.total, maxPages)` trang đầu; đặt
  `getScreenshot({ first: pages, ... })`. Thêm vào `OcrTextResult` cờ `truncatedPages?: boolean`
  và `totalPages?: number` khi `info.total > maxPages`.
- Giữ một trần cứng an toàn tuyệt đối (vd 30) để tránh PDF khổng lồ; trên trần đó mới throw.
- `ExtractedCvText` (cv-text-extractor.service.ts:16-21) thêm `ocrTruncated?: boolean`; ghi vào
  `structuredData` để HR biết CV bị cắt trang.

**Files:** `cv-ocr.service.ts`, `cv-text-extractor.service.ts`, `ai.service.ts` (ghi metadata) + spec.
**Tests:** PDF 12 trang, maxPages=10 → OCR 10 trang, `truncatedPages=true`, không throw.
**Rủi ro:** thấp.

---

## #2. Extractor: xử lý PDF "lai" (text + ảnh scan) — `cv-text-extractor.service.ts`

**Vấn đề:** quyết định OCR chỉ dựa `hasEnoughText(pdfText)` với ngưỡng phẳng 40 ký tự
(:42, :82-84). PDF có header text + thân ảnh (rất phổ biến ở CV Việt) → dùng luôn text
mỏng, bỏ sót nội dung ảnh → hỏng cả trích profile lẫn chấm điểm.

**Thay đổi (giữ đơn giản, đo bằng #8):**
- Đổi tiêu chí quyết định từ "đủ 40 ký tự" sang **mật độ text theo số trang**:
  lấy `pageCount` từ pdf-parse `getInfo()`; nếu `pdfText.length / pageCount < NGƯỠNG`
  (vd 200 ký tự/trang) → coi là nghi ngờ scan/ảnh → chạy OCR.
- Khi cả pdf-text và OCR đều có: **chọn nguồn nhiều "text có nghĩa" hơn** (so độ dài sau
  `normalizeExtractedText`), KHÔNG merge (tránh trùng lặp). Ghi `parser` = nguồn được chọn.
- Bổ sung phát hiện **mojibake/gibberish** đơn giản: nếu tỉ lệ ký tự thay-thế/không-in-được
  cao bất thường → ưu tiên OCR. (Heuristic nhẹ, đừng phức tạp hóa.)
- Đưa các ngưỡng thành hằng số có tên rõ ràng ở đầu file (dễ chỉnh + test).

**Files:** `cv-text-extractor.service.ts` (+ spec).
**Tests:** giả lập pdf-text mỏng theo pageCount → OCR được gọi; OCR dài hơn → chọn OCR; pdf-text đủ dày → không OCR (giữ hành vi nhanh cũ).
**Rủi ro:** trung bình — OCR chạy nhiều hơn → chậm hơn cho PDF text mỏng nhưng hợp lệ. Ngưỡng phải chỉnh qua #8. Kết hợp #1 để bù chi phí OCR.

---

## #6. OCR: dùng confidence để gắn cờ chất lượng — `cv-ocr.service.ts` + `ai.service.ts`

**Vấn đề:** confidence được tính (cv-ocr.service.ts:92-95) nhưng **không dùng** — OCR 30%
vẫn chảy vào AI như dữ liệu tin cậy.

**Thay đổi:**
- Định nghĩa ngưỡng `OCR_MIN_CONFIDENCE` (default ~55). Khi `ocrConfidence < ngưỡng`:
  - KHÔNG chặn (vẫn tiếp tục), nhưng ghi `structuredData.lowConfidenceOcr = true` và bổ sung vào
    `summary`/`risks` một dòng "OCR chất lượng thấp — nên kiểm tra thủ công".
  - Ở talent pool (sau này) cũng đọc cờ này để hiển thị cảnh báo cho TA.
- Đảm bảo cờ được truyền qua `ExtractedCvText` → ghi vào `CvParseResult.structuredData` tại
  `ai.service.ts` (chỗ ghi metadata extraction ~:100-140).

**Files:** `cv-ocr.service.ts`, `cv-text-extractor.service.ts`, `ai.service.ts` (+ spec). `OCR_MIN_CONFIDENCE` vào `env.validation.ts` (optional).
**Tests:** confidence dưới ngưỡng → cờ `lowConfidenceOcr=true` trong metadata.
**Rủi ro:** thấp (chỉ thêm metadata + text cảnh báo).

---

## #4. Scoring: nâng chất lượng trích criteria — `match-scoring.ts`

**Vấn đề:** `extractMatchCriteria` (:3-20) tách dòng thô từ requirements (đã là plain text
qua `htmlToPlainText`), cắt 12 dòng, đoán required/optional bằng regex keyword. JD viết
dạng **đoạn văn** (không bullet) → mỗi đoạn thành 1 "criterion" khổng lồ hoặc bị bỏ → điểm kém.
Đây là đòn bẩy chất lượng điểm lớn nhất.

**Thay đổi (giữ criteria DETERMINISTIC — id/weight ổn định để map evaluation):**
- Khi một dòng quá dài hoặc là đoạn văn: **tách câu** (theo `. ; •` và xuống dòng) để ra
  các criteria hạt nhỏ hơn; loại câu quá ngắn/heading.
- Cải thiện `isSectionHeading` (:58-71): nhận thêm heading tiếng Việt ("Yêu cầu", "Trách nhiệm",
  "Kỹ năng", "Quyền lợi", "Mô tả công việc", ...). Hiện `SECTION_HEADINGS` chỉ có tiếng Anh (:73-88).
- Cải thiện phát hiện `required` (:11): mở rộng từ khóa VN ("bắt buộc", "yêu cầu", "tối thiểu",
  "ít nhất") cho required và ("ưu tiên", "lợi thế", "là một điểm cộng") cho optional; mặc định required.
- Nâng cap từ 12 → ~15 (tránh JD dài bị cắt criteria quan trọng); vẫn có trần để không nổ prompt.
- (TÙY CHỌN, sau khi đo #8) Nếu heuristic vẫn kém với JD prose: thêm bước LLM trích criteria
  (một Zod schema `criteriaSchema`, prompt riêng) **có fallback về heuristic** khi AI tắt/lỗi.
  KHÔNG bắt buộc ở v1 — chỉ làm nếu #8 cho thấy heuristic không đạt.

**Files:** `match-scoring.ts` (+ spec mở rộng). (Tùy chọn) `ai.types.ts`/`ollama-ai.provider.ts`/`ai.prompt.ts` nếu thêm LLM criteria.
**Tests:** JD dạng prose → ra nhiều criteria hợp lý; heading VN không bị tính là criterion; required/optional đúng cho câu VN.
**Rủi ro:** trung bình — đổi criteria làm **đổi điểm** của các hồ sơ cũ nếu chạy lại. Không hồi tố (chỉ áp cho phân tích mới). Đo trước/sau bằng #8.

---

## #5. Provider: JSON parse resilience — `ollama-ai.provider.ts`

**Vấn đề:** `matchAnalysisSchema.parse(JSON.parse(rawContent))` (:86) một phát. Model nhỏ
`qwen3:4b` đôi khi bọc code-fence / thừa text / sai schema → cả attempt fail (BullMQ retry
nhưng tốn nguyên 1 lần gọi LLM).

**Thay đổi:**
- Tạo helper `parseStructuredResponse(raw, schema)`:
  1. Strip code fence (```json ... ```), trim.
  2. Nếu parse thẳng lỗi → trích khối `{...}` đầu tiên (cân bằng ngoặc) rồi parse lại.
  3. `schema.safeParse`; nếu fail → ném lỗi có kèm `issues` để log.
- Trong `analyzeMatch`: nếu `safeParse` fail lần 1, thực hiện **một** lần "repair" — gọi lại
  `client.chat` với message bổ sung nêu lỗi schema và yêu cầu trả đúng JSON (vẫn `format` = schema).
  Fail lần 2 → throw (BullMQ xử lý retry cấp job như cũ).
- Áp helper này cho cả `extractProfile` sau này (talent pool Phase 2) để đồng nhất.

**Files:** `ollama-ai.provider.ts` (+ helper + spec).
**Tests:** raw có code-fence → parse OK; raw thừa text quanh JSON → trích khối OK; schema sai lần 1 rồi OK lần 2 → repair chạy; sai 2 lần → throw.
**Rủi ro:** thấp — repair thêm 1 lần gọi LLM khi lỗi (chấp nhận được). Đảm bảo không lặp vô hạn (đúng 1 lần repair).

---

## #7. Ops: dead-letter + quan sát tỉ lệ lỗi — `ai-queue.service.ts`

**Vấn đề:** job fail chỉ `logger.warn` (:65-67); không có số liệu tỉ lệ lỗi, không có nơi
tra cứu job "chết".

**Thay đổi (nhẹ, đủ cho volume thấp):**
- **Log lỗi có cấu trúc, ổn định để alert**: khi job fail ở lần cuối, log ở mức `error` với
  prefix cố định (vd `AI_JOB_FAILED`) kèm `queue`, `jobId`, `applicationId`/`poolEntryId`, `stage`, `attemptsMade`.
- **Đếm số liệu trong tiến trình**: counter đơn giản (completed/failed theo queue) expose qua
  `HealthModule` (thêm field vào health payload) hoặc log định kỳ. KHÔNG cần Prometheus cho volume này.
- **Dead-letter = trạng thái DB**: `CvParseResult.status = FAILED` (đã có) chính là bản ghi "chết"
  tra cứu được. Bổ sung: ghi tài liệu truy vấn "các phân tích FAILED gần đây" + (talent pool)
  `TalentPoolEntry.status = FAILED`. Cân nhắc endpoint admin `GET /admin/ai/failures` (tùy chọn, nếu cần UI).
- Giữ `removeOnFail: 100` (:141) hoặc tăng nhẹ để còn dấu vết job trong Redis khi điều tra.

**Files:** `ai-queue.service.ts`, (tùy chọn) `health` module. (+ spec cho việc log lỗi cuối cùng đúng mức `error`.)
**Rủi ro:** thấp.

---

## Verification tổng (chạy sau khi làm)

1. `pnpm --filter @hr-copilot/api build` + eslint + `tsc` sạch.
2. `pnpm --filter @hr-copilot/api test` — toàn bộ pass; bổ sung spec cho từng mục ở trên.
3. **Eval trước/sau (#8):** chạy `pnpm --filter @hr-copilot/api eval:cv` trên fixtures với
   `AI_PROVIDER=ollama` (Ollama + model sẵn sàng). So bảng kết quả trước/sau #2 và #4:
   - #2: `pdf-hybrid.pdf` phải tăng số ký tự trích / bắt được email/phone kỳ vọng.
   - #3: `pdf-multipage.pdf` không còn fail; có cờ `truncatedPages`.
   - #4: JD prose mẫu cho ra nhiều criteria hợp lý, tỉ lệ evaluation `unknown` giảm.
   - #1: đo thời gian OCR nhiều CV giảm rõ so với trước (worker reuse).
4. **Regression:** chạy lại luồng `POST /applications` end-to-end (nộp 1 CV PDF text, 1 PDF scan) →
   `CvParseResult` COMPLETED, `MatchResult` có điểm; không có lỗi mới.
5. Dùng skill `/verify` hoặc `/run` để drive app thật khi có thể.

## Rủi ro & giảm thiểu (tổng hợp)

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| #1 | Worker sống lâu giữ RAM / mutex deadlock / worker vào trạng thái lỗi | 1 worker + mutex đơn giản; tạo lại worker nếu recognize ném lỗi; terminate onModuleDestroy; test kỹ |
| #2 | OCR chạy nhiều hơn → chậm hơn cho PDF text mỏng hợp lệ | Bù bằng #1; ngưỡng mật độ chỉnh qua #8; chọn nguồn dài hơn, không merge |
| #4 | Đổi criteria làm đổi điểm hồ sơ cũ | Không hồi tố; chỉ áp cho phân tích mới; đo trước/sau bằng #8 |
| #5 | Repair lặp / tốn thêm LLM call | Đúng 1 lần repair rồi throw |
| chung | Không có breaking migration | Tất cả field mới là optional trong JSON; rolling deploy an toàn |

## Ghi chú deploy
- Không có thay đổi schema DB → không có migration → deploy an toàn.
- Các biến env mới đều **optional có default** (`OCR_MIN_CONFIDENCE`, `OCR_WORKER_POOL_SIZE` nếu làm pool) — thêm vào `env.validation.ts` `integerVariables` nếu dùng.
- Sau khi hoàn tất tài liệu này và verify, mới chuyển sang [talent-pool-implementation-plan.md](./talent-pool-implementation-plan.md).
