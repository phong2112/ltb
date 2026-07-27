# Talent Pool — Kế hoạch triển khai chi tiết (handoff cho agent thực thi)

> ⚠️ **TIỀN ĐIỀU KIỆN:** Hoàn thành [pipeline-improvement-plan.md](./pipeline-improvement-plan.md)
> **TRƯỚC** khi bắt đầu tài liệu này. Talent pool dùng lại cùng extractor + OCR; các cải tiến
> #1 (OCR worker reuse), #2 (PDF lai), #3 (PDF nhiều trang) trong tài liệu đó de-risk trực tiếp
> cho luồng bulk upload ở Phase 1 bên dưới, và #5 (JSON parse resilience) được dùng lại cho
> `extractProfile` ở Phase 2.
>
> **Mục đích tài liệu này:** cung cấp đủ chi tiết để một agent/dev **chưa có ngữ cảnh**
> có thể thực thi trọn vẹn tính năng. Đọc hết phần Context + Nguyên tắc trước khi code.
> Mọi đường dẫn file, tên hàm, số dòng đều tham chiếu repo tại thời điểm viết
> (`feature/ai-agent`). Nếu số dòng lệch, tìm theo tên hàm.

---

## 0. Context & mục tiêu

Đây là một ATS (applicant tracking system). Repo monorepo pnpm:
- Backend: `apps/api` — NestJS 11, Prisma 7 (Postgres), BullMQ + Redis, Ollama (self-host) cho AI.
- Frontend: `apps/web` — **Vite + React 19 SPA** (KHÔNG phải Next.js), `react-router` v7.
- DB schema: `packages/db/prisma/schema.prisma`.

**Hiện trạng:** chỉ có MỘT luồng nạp CV — ứng viên tự nộp công khai qua
`POST /applications` ([apps/api/src/modules/applications/applications.controller.ts:67](../apps/api/src/modules/applications/applications.controller.ts#L67),
`FileInterceptor("cv")`, 1 file, bắt buộc `jobId` + `consentAccepted`). Pipeline
trích xuất + AI đã hoàn thiện tốt:
- `CvTextExtractorService.extract()` — cascade **parser → OCR** (pdf-parse / mammoth / word-extractor, fallback tesseract `vie`+`eng`).
- `AiQueueService` — BullMQ, 2 queue nối tiếp `cv-extraction → ai-cv-match`, chỉ bật khi `AI_PROVIDER=ollama`.
- `OllamaAiProvider.analyzeMatch()` — chấm điểm CV vs JD.

**Thiếu:** luồng cho **TA (HR)** chủ động **upload hàng loạt CV**, **tự trích thông tin
cá nhân** (name/email/phone/skills), lưu vào **talent pool độc lập** (không bắt buộc gắn
job), và/hoặc gán vào một JD.

**Mục tiêu:** thêm talent pool theo mô hình ATS lớn (Greenhouse/Lever/Ashby): tách "pool"
khỏi "application vào một requisition", **tái dùng tối đa** pipeline hiện có.

### Nguyên tắc bất di bất dịch (RÀNG BUỘC)
1. **KHÔNG được phá luồng `POST /applications` đang chạy production.** Mọi thay đổi phải
   additive/backward-compatible; rolling deploy an toàn.
2. **KHÔNG đụng** `CvParseResult`, `MatchResult` (đều `applicationId @unique`), 2 queue AI cũ.
3. Tái dùng, không viết lại: text extractor, AI provider pattern, candidate dedup, file storage, endpoint xem CV.
4. AI **tùy chọn**: `AI_PROVIDER=disabled` thì upload vẫn phải chạy (text + regex), không kẹt status.

### Quyết định kiến trúc đã chốt
- **Pool = model độc lập `TalentPoolEntry`.** Không sửa invariant/unique constraint của `Application`.
- **File dùng chung `CandidateFile`** (single document store — chuẩn ATS, tái dùng endpoint xem CV).
- **Trích info cascade:** parser → (không đủ text) → OCR → cuối cùng AI. Regex lấy email/phone; AI bổ sung name/skills.
- **Match analysis chỉ chạy khi promote** entry thành Application (tái dùng queue cũ). Pool không tự chạy match.
- **Gán JD hai chiều:** upload có thể chọn JD đích (auto-promote sau khi trích xong) hoặc để pool chung.

---

## PHASE 1 — Backend core (schema, migration, storage, module CRUD, chưa cần AI)

### 1.1 Sửa Prisma schema — `packages/db/prisma/schema.prisma`

**(a) Thêm enum** (cạnh các enum khác, ~dòng 46):
```prisma
enum TalentPoolSource {
  TA_UPLOAD
}
```

**(b) Thêm model `TalentPoolEntry`** (đặt sau model `Candidate`):
```prisma
model TalentPoolEntry {
  id                    String           @id @default(cuid())
  candidateId           String
  status                CvParseStatus    @default(PENDING)   // tái dùng enum sẵn có
  source                TalentPoolSource @default(TA_UPLOAD)
  uploadedByUserId      String?
  summary               String?
  structuredData        Json?            // profile parse: {fullName,email,phone,linkedinUrl,portfolioUrl,title,skills[],yearsExperience,parser,ocrUsed,...}
  extractedText         String?
  errorMessage          String?
  tags                  String[]         @default([])
  notes                 String?
  promotedApplicationId String?          @unique
  candidate             Candidate        @relation(fields: [candidateId], references: [id], onDelete: Restrict)
  uploadedBy            User?            @relation(fields: [uploadedByUserId], references: [id], onDelete: SetNull)
  promotedApplication   Application?     @relation("PromotedFromPool", fields: [promotedApplicationId], references: [id], onDelete: SetNull)
  file                  CandidateFile?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  @@index([candidateId])
  @@index([status])
  @@index([createdAt])
}
```

**(c) Sửa model `CandidateFile`** (hiện `applicationId` NOT NULL):
```prisma
model CandidateFile {
  id                String           @id @default(cuid())
  applicationId     String?          // ĐỔI: nullable
  talentPoolEntryId String?          // THÊM
  kind              FileKind         @default(CV)
  // ... giữ nguyên các field storage khác ...
  application       Application?     @relation(fields: [applicationId], references: [id], onDelete: Restrict) // ĐỔI: optional
  talentPoolEntry   TalentPoolEntry? @relation(fields: [talentPoolEntryId], references: [id], onDelete: Restrict) // THÊM
  cvParseResults    CvParseResult[]
  activities        ActivityLog[]
  createdAt         DateTime         @default(now())

  @@index([applicationId])
  @@index([talentPoolEntryId])   // THÊM
  @@index([applicationId, kind])
  @@index([storageTier])
}
```
> CHECK "đúng một chủ sở hữu" thêm bằng raw SQL trong migration (Prisma không model được CHECK).

**(d) Thêm quan hệ ngược:**
- `Candidate`: thêm `talentPoolEntries TalentPoolEntry[]`.
- `User`: thêm `talentPoolUploads TalentPoolEntry[]`.
- `Application`: thêm `promotedFromPool TalentPoolEntry? @relation("PromotedFromPool")`.

### 1.2 Migration SQL (an toàn cho rolling deploy)

`prisma migrate deploy` chạy lúc container boot ([apps/api/Dockerfile:23](../apps/api/Dockerfile#L23)).
**Migration hỏng → chặn boot vĩnh viễn** → phải test trên DB giống prod trước.

Tạo migration bằng: `pnpm --filter @hr-copilot/db exec prisma migrate dev --name talent_pool --create-only`
rồi **sửa tay** SQL sinh ra để đảm bảo thứ tự & dùng `NOT VALID`. Nội dung cần có:

**Migration 1** (`..._talent_pool/migration.sql`):
```sql
-- enum + bảng mới
CREATE TYPE "TalentPoolSource" AS ENUM ('TA_UPLOAD');
CREATE TABLE "TalentPoolEntry" ( ... theo model ... );
CREATE INDEX ... -- candidateId, status, createdAt
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT ..._candidateId_fkey ...;
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT ..._uploadedByUserId_fkey ...;
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT ..._promotedApplicationId_fkey ...;

-- nới CandidateFile (catalog-only, tức thì, không rewrite)
ALTER TABLE "CandidateFile" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "CandidateFile" ADD COLUMN "talentPoolEntryId" TEXT;
CREATE INDEX "CandidateFile_talentPoolEntryId_idx" ON "CandidateFile"("talentPoolEntryId");
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_talentPoolEntryId_fkey"
  FOREIGN KEY ("talentPoolEntryId") REFERENCES "TalentPoolEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK đúng một chủ sở hữu — NOT VALID để KHÔNG full-scan khóa bảng
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_owner_exactly_one"
  CHECK (num_nonnulls("applicationId","talentPoolEntryId") = 1) NOT VALID;
```

**Migration 2 RIÊNG** (`..._validate_candidate_file_owner/migration.sql`) — tách để khóa nhẹ (SHARE UPDATE EXCLUSIVE), không chặn luồng ứng tuyển:
```sql
ALTER TABLE "CandidateFile" VALIDATE CONSTRAINT "CandidateFile_owner_exactly_one";
```
> Mọi row hiện tại đều có `applicationId` non-null nên thỏa CHECK sẵn — validate gần như tức thì. Tách 2 migration vì Prisma bọc mỗi file trong 1 transaction.

Mẫu CHECK raw SQL đã có: `packages/db/prisma/migrations/20260712100000_application_scoped_followups_messages/migration.sql:141`. Mẫu flip NOT NULL: `20260710090000_link_candidate_files_to_applications`.

Sau migration: `pnpm --filter @hr-copilot/db exec prisma generate`.

### 1.3 Tách util dùng chung (tránh trùng code với applications flow)

Tạo `apps/api/src/modules/candidates/candidate-contact.util.ts` — **di chuyển** (không copy) từ `applications.service.ts`:
- `normalizeEmail` ([applications.service.ts:402](../apps/api/src/modules/applications/applications.service.ts#L402))
- `normalizePhone` ([:406](../apps/api/src/modules/applications/applications.service.ts#L406))
- `lockCandidateContacts` ([:390](../apps/api/src/modules/applications/applications.service.ts#L390))

Cập nhật `applications.service.ts` import từ util mới (giữ hành vi y hệt — chạy lại test applications để chắc chắn không đổi).

Tạo `apps/api/src/modules/files/file-signature.util.ts` — **di chuyển** `hasAllowedFileSignature` + `hasPdfSignature` + các hằng chữ ký từ [applications.controller.ts](../apps/api/src/modules/applications/applications.controller.ts) (cuối file). Controller cũ import lại từ util.

> Lý do "di chuyển" thay vì copy: một nguồn sự thật cho dedup/validation, tránh lệch logic giữa 2 luồng.

### 1.4 Storage — thêm scope descriptor — `apps/api/src/modules/files/cv-storage.service.ts`

Path pool: `cv/{candidateId}/pool/{talentPoolEntryId}/{ts}-{name}` (GIỮ tiền tố `cv/` để helper detect route đúng — segment literal `pool` không đụng cuid).

Refactor: thay 2 tham số vị trí `(candidateId, applicationId)` bằng **scope descriptor**:
```ts
type CvStorageScope =
  | { kind: "application"; candidateId: string; applicationId: string }
  | { kind: "pool"; candidateId: string; talentPoolEntryId: string };

// helper trung tâm — mọi driver gọi cái này để lấy segment giữa
function buildScopeSegment(scope: CvStorageScope): string {
  return scope.kind === "application"
    ? `${scope.candidateId}/${scope.applicationId}`
    : `${scope.candidateId}/pool/${scope.talentPoolEntryId}`;
}
```
Sửa các hàm dùng `${candidateId}/${applicationId}`: `storeCandidateCv` (:55), `storeInVercelBlob` (:172), `storeLocally` (:192/194 + mkdir), `storeInR2` (:210). Thêm `storePoolCv(file, candidateId, poolEntryId)` gọi cùng đường dispatch với scope `pool`.
- Giữ `storeCandidateCv` chữ ký cũ (wrap sang scope `application`) để applications.service không phải đổi, HOẶC đổi cả 2 call-site — tùy, miễn hành vi path application **không đổi**.
- `CvRelocationContext` (:31): cho `applicationId` optional (chỉ ảnh hưởng archive/restore — pool chưa cần archive ở v1).

**KHÔNG sửa** `isR2Path` (:314), `isVercelBlobPath` (:318), `isManagedStoragePath` (:161) — chúng match trên tiền tố `cv/`/`archive/cv/`/`r2://`, giữ nguyên là route đúng. **Chỉ verify** bằng test.

### 1.5 Module talent-pool (CRUD, chưa AI) — thư mục `apps/api/src/modules/talent-pool/`

Theo khuôn `candidates` module. Guard: `@UseGuards(JwtAuthGuard)` ([apps/api/src/modules/auth/jwt-auth.guard.ts](../apps/api/src/modules/auth/jwt-auth.guard.ts)) ở **cấp controller**. Prefix `@Controller("admin/talent-pool")`.

**DTO** (`dto/`): `upload.dto.ts` (`targetJobId?: string`, validate optional), `update-entry.dto.ts` (`fullName?/email?/phone?/title?/skills?/tags?/notes?`), `promote.dto.ts` (`jobId: string`), `list-query.dto.ts` (`search?/status?/page?/pageSize?/jobId?`).

**`talent-pool.service.ts`** — các method:
- `uploadMany(files, opts: { targetJobId?; uploadedByUserId? })`: với mỗi file (xử lý tuần tự hoặc `Promise.allSettled`):
  1. validate chữ ký file (util 1.3). Sai → kết quả `{ status: "error", reason }`.
  2. Trích **đồng bộ tối thiểu**: chưa cần AI ở Phase 1 — chỉ cần lưu file + tạo entry `PENDING`, để Phase 2 enqueue trích. (Phase 1 có thể chạy `CvTextExtractorService.extract` + regex đồng bộ để có text/email/phone ngay; xem 2.x. Nếu muốn Phase 1 độc lập AI, chạy extract+regex đồng bộ tại đây.)
  3. Dedup/tạo Candidate: dùng advisory-lock + contact match giống applications.service (tái dùng util 1.3). **Khác biệt quan trọng:** pool KHÔNG có ràng buộc unique `(candidateId, jobId)` — một candidate có thể có nhiều pool entry; cân nhắc dedup theo `(candidateId)` để tránh trùng người (tùy policy: cho phép trùng nhưng cảnh báo, hoặc gộp). **Chốt v1:** cho phép nhiều entry/candidate, không chặn trùng (TA có thể xóa).
  4. Tạo `TalentPoolEntry` + `CandidateFile` (owner = poolEntry) trong 1 transaction; lưu file qua `storePoolCv` (rollback xóa file nếu tx fail — theo mẫu try/catch + `deleteCandidateCv` ở [applications.service.ts:176](../apps/api/src/modules/applications/applications.service.ts#L176)).
  5. `ActivityLog` action `talent_pool_uploaded` (actor `admin`).
  6. Nếu `targetJobId`: gọi `promote(entryId, targetJobId)` (Phase 2 mới có match; Phase 1 tạo Application là được).
  7. Trả `{ fileName, status: "created"|"duplicate"|"error", entryId?, reason? }`. **Một file lỗi KHÔNG làm hỏng cả batch.**
- `list(query)`: phân trang, search theo `candidate.fullName`/email, filter status/tag. Include candidate + file id + summary.
- `getEntry(id)`: detail (structuredData, status, fileId để preview, promotedApplicationId).
- `updateEntry(id, dto)`: TA sửa profile parse sai / tags / notes → cập nhật `structuredData` + `Candidate` tương ứng nếu cần.
- `promote(id, jobId)`: tạo `Application` cho (candidate, job) tái dùng đường tạo application; **copy** `extractedText`/`structuredData` từ entry sang `CvParseResult` mới để **khỏi OCR lại**; tạo `CandidateFile` mới owner=application trỏ **cùng path đã lưu** (v1 chấp nhận 2 row cùng path; KHÔNG xóa file vật lý khi 1 owner mất — thêm guard ở delete). Set `entry.promotedApplicationId`. Phase 2: enqueue match. Xử lý xung đột unique `(candidateId, jobId)` → trả lỗi "đã ứng tuyển job này".
- `deleteEntry(id)`: xóa entry + file (chỉ xóa file vật lý nếu không có Application nào trỏ cùng path).

**`talent-pool.controller.ts`** endpoints:
| Method | Path | Ghi chú |
|---|---|---|
| POST | `admin/talent-pool/upload` | `@UseInterceptors(FilesInterceptor("cvs", MAX_FILES))`, body `targetJobId?`. Validate mỗi file size ≤ `MAX_CV_FILE_SIZE_MB`. Lấy `uploadedByUserId` từ req.user. |
| GET | `admin/talent-pool` | list + query |
| GET | `admin/talent-pool/:id` | detail |
| PATCH | `admin/talent-pool/:id` | sửa profile/tags/notes |
| POST | `admin/talent-pool/:id/promote` | body `{ jobId }` |
| DELETE | `admin/talent-pool/:id` | xóa |

`MAX_FILES`: thêm hằng (vd 20) + đọc từ config nếu muốn. Đăng ký `MulterModule`/`FilesInterceptor` như applications module.

**`talent-pool.module.ts`**: providers `TalentPoolService`; imports `PrismaModule`, `FilesModule` (cv-storage), `AiModule` (ở Phase 2 cho queue + extractor), `JobsModule` (validate job khi promote), `AuthModule` (guard). Export nếu cần.

### 1.6 Sửa `openCandidateFile` null-safe — `apps/api/src/modules/candidates/candidates.service.ts:160`

Hiện đọc `file.application.candidateId` → **NPE nếu file thuộc pool** (application null).
Sửa: đọc `candidateId` từ đúng chủ sở hữu:
```ts
const candidateId = file.applicationId
  ? file.application?.candidateId
  : file.talentPoolEntry?.candidateId;
```
Include cả `talentPoolEntry` trong query. Endpoint `GET /admin/candidates/files/:fileId` khi đó phục vụ được cả file pool → **frontend xem CV pool dùng lại luôn** endpoint này (không cần endpoint mới).
Kiểm tra thêm `cv-storage-lifecycle.service.ts:45` — query filter `application: { jobId }` nên KHÔNG bao giờ chọn phải pool file → an toàn, **giữ nguyên filter đó**.

### 1.7 Đăng ký module — `apps/api/src/modules/app.module.ts`

Thêm `TalentPoolModule` vào mảng `imports` (:13-33).

### 1.8 Tests Phase 1

- `talent-pool.service.spec.ts`: dedup candidate; per-file result (created/duplicate/error), 1 file lỗi không hỏng batch; promote tạo Application + copy text + set promotedApplicationId; delete guard file dùng chung.
- `cv-storage.service.spec.ts` (bổ sung): path pool đúng `cv/{cand}/pool/{entry}/...`; `isVercelBlobPath`/`isManagedStoragePath` vẫn route đúng path pool.
- `file-signature.util.spec.ts`, `candidate-contact.util.spec.ts` (nếu tách ra thì di chuyển test tương ứng).
- Chạy lại **toàn bộ** test applications để chắc refactor util không đổi hành vi.

---

## PHASE 2 — AI (trích profile + queue pool + promote→match)

### 2.1 Regex parser — tạo `apps/api/src/modules/ai/parse-cv-profile.ts`

Hàm thuần (không phụ thuộc DI), input là text đã trích, output field deterministic:
```ts
export type RegexCvProfile = { email?: string; phone?: string; linkedinUrl?: string; portfolioUrl?: string };
export function parseCvProfileFromText(text: string): RegexCvProfile
```
- email: regex chuẩn, lấy cái đầu hợp lệ.
- phone: regex số VN (bắt cả `+84`, khoảng trắng/gạch), chuẩn hóa bằng `normalizePhone` (util 1.3).
- linkedin: `linkedin.com/in/...`; portfolio: URL http(s) đầu tiên không phải linkedin.
Kèm spec: các định dạng phổ biến (VN phone, +84, có nhãn "Email:", nhiều URL).

### 2.2 Thêm `extractProfile` vào AI provider

**`apps/api/src/modules/ai/ai.types.ts`** (interface tại :42):
```ts
export type ExtractProfileInput = { cvText: string; fileName: string };
export type ExtractedProfile = {
  fullName: string | null;
  title: string | null;
  yearsExperience: number | null;
  skills: string[];
  languages: string[];
};
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis>;
  extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile>; // THÊM
}
```
Mọi class `implements AiProvider` phải thêm method (grep `implements AiProvider`).

**`apps/api/src/modules/ai/ai.prompt.ts`**: thêm `buildExtractProfilePrompt(input)` + `export const EXTRACT_PROFILE_PROMPT_VERSION`. Prompt này **được phép** trích tên/skills (khác match prompt cố ý tránh PII để chống thiên vị — [ai.prompt.ts](../apps/api/src/modules/ai/ai.prompt.ts)). Yêu cầu trả JSON đúng schema, tiếng Việt cho title/skills khi phù hợp.

**`apps/api/src/modules/ai/ollama-ai.provider.ts`**: implement `extractProfile` **theo đúng khuôn `analyzeMatch`** (:46-115):
- Định nghĩa Zod schema `extractedProfileSchema`, truyền `format: z.toJSONSchema(extractedProfileSchema)` vào `client.chat`.
- `options: { temperature: 0, num_ctx: this.contextLength }`, `keep_alive: "10m"`, `stream:false`, `think:false`.
- Parse `extractedProfileSchema.parse(JSON.parse(response.message.content))`.
- Cắt `cvText` theo giới hạn ký tự như `MAX_AI_CV_CHARACTERS`.

### 2.3 Service trích pool — thêm vào `AiService` (hoặc tạo `PoolProcessingService` trong ai module)

`processPoolEntry(talentPoolEntryId)`:
1. Load entry + file. Set status `EXTRACTING`.
2. `text = await textExtractor.extract(file)` — **tái dùng nguyên** ([cv-text-extractor.service.ts](../apps/api/src/modules/ai/cv-text-extractor.service.ts)); shape `{originalName, mimeType, path}` khớp `CandidateFileForExtraction`.
3. `regex = parseCvProfileFromText(text.text)`.
4. Nếu AI bật: `ai = await provider.extractProfile({ cvText, fileName })`. Nếu tắt/lỗi: `ai = null`, fullName fallback = tên file (bỏ đuôi), status vẫn tiến (không kẹt).
5. Merge → `structuredData` (regex ưu tiên cho email/phone; AI cho name/title/skills), cập nhật `Candidate` (email/phone/fullName nếu đang trống). Set status `COMPLETED`, lưu `extractedText`, `summary`.
6. Lỗi cứng → status `FAILED` + `errorMessage` (giống `markFailed` pattern).

> Lưu ý: `analyzeMatch` cũng trả `CandidateProfile` nhưng gắn job — KHÔNG dùng cho pool. Pool dùng `extractProfile` riêng.

### 2.4 Queue pool — `apps/api/src/modules/ai/ai-queue.service.ts`

Thêm queue thứ 3 **`talent-pool-extraction`**, job `extract-pool`, payload `{ talentPoolEntryId }` — SONG SONG, KHÔNG đụng 2 queue cũ:
- Constants + queue/worker mới (mirror `extractionQueue`/`extractionWorker` :43-61).
- `enqueuePoolEntry(talentPoolEntryId)`: nếu `!enabled` trả `false`; else add job. `jobId: extract-pool-${id}`.
- Worker `processPoolExtractionJob` → `poolProcessing.processPoolEntry(id)`; `markFailed` ở final attempt.
- Concurrency đọc config (thêm `POOL_EXTRACTION_CONCURRENCY`, default 2) — thêm vào `env.validation.ts` `integerVariables` ([apps/api/src/config/env.validation.ts:10](../apps/api/src/config/env.validation.ts#L10)).
- `onModuleDestroy` đóng queue/worker mới.

`TalentPoolService.uploadMany` bước (2): sau khi tạo entry, gọi `aiQueueService.enqueuePoolEntry(id)`; nếu trả `false` (AI off) thì chạy `poolProcessing.processPoolEntry(id)` **đồng bộ phần text+regex** (bỏ AI) để entry vẫn có email/phone và status `COMPLETED`.

### 2.5 promote→match

Trong `TalentPoolService.promote`: sau khi tạo Application + copy text sang `CvParseResult`, gọi `aiQueueService.enqueue(applicationId)` (**queue cũ, không đổi**). Nếu AI off, giữ pattern `markAiUnavailable` như [applications.service.ts:260](../apps/api/src/modules/applications/applications.service.ts#L260).

### 2.6 Tests Phase 2
- `parse-cv-profile.spec.ts` (2.1).
- `ollama-ai.provider` extractProfile: mock `Ollama.chat`, assert format schema + parse.
- `processPoolEntry`: AI bật (mock provider) và AI tắt (fallback tên file), lỗi extract → FAILED.
- queue: `enqueuePoolEntry` trả false khi disabled.

---

## PHASE 3 — Frontend (Vite + React SPA) — `apps/web`

### 3.1 Routes + nav
- `apps/web/src/app/routes.tsx`: thêm `/admin/talent-pool` và `/admin/talent-pool/:id`, bọc `RequireAdmin` + `AdminLayout` (theo mẫu các route admin hiện có). Lazy-load 2 page mới.
- `apps/web/src/app/layouts/AdminLayout.tsx`: thêm link nav "Kho ứng viên" (talent pool).

### 3.2 Trang upload + list — `pages/TalentPool.tsx`
- Dropzone multi-file: **tái dùng pattern** input file + validation (ext/MIME/size) từ [apps/web/src/app/components/ApplicationForm.tsx](../apps/web/src/app/components/ApplicationForm.tsx) (~:458-475). Cho phép chọn nhiều file.
- Optional select JD đích (load jobs qua `apiRequest("/admin/jobs")`).
- Submit: `FormData`, append từng file field `cvs`, kèm `targetJobId`; `apiRequest("/admin/talent-pool/upload", { method: "POST", body: formData })` (api-client tự bỏ Content-Type khi body là FormData — [apps/web/src/app/services/api-client.ts](../apps/web/src/app/services/api-client.ts)).
- Hiển thị kết quả từng file (created/duplicate/error) + progress.
- List bên dưới: bảng entry (tên, email, status, tags, ngày) + search/filter/pagination — theo mẫu [pages/CandidateInbox.tsx](../apps/web/src/app/pages/CandidateInbox.tsx).

### 3.3 Trang detail — `pages/TalentPoolDetail.tsx`
- Hiển thị profile parse + form sửa (PATCH). Xem CV inline: **tái dùng** `CvPreviewPanel` (đọc `${API_BASE}/admin/candidates/files/:fileId` — [components/CandidateDetailSections.tsx](../apps/web/src/app/components/CandidateDetailSections.tsx)).
- Nút "Gán vào JD" → chọn job → `POST /admin/talent-pool/:id/promote`. Sau promote hiển thị link tới CandidateDetail của Application.
- Nút xóa.

### 3.4 Auth
Không cần gì thêm: `apiRequest` dùng cookie (`credentials:"include"`), tự refresh 401. Guard `RequireAdmin` lo redirect.

---

## Verification (chạy sau mỗi phase)

**Phase 1:**
1. `pnpm --filter @hr-copilot/db exec prisma migrate dev` trên DB test **có sẵn data CandidateFile** → không lỗi. Kiểm tra CHECK: insert CandidateFile với cả 2 owner → phải FAIL; với 0 owner → phải FAIL; với đúng 1 → OK.
2. `pnpm --filter @hr-copilot/api build` + eslint sạch, `tsc` không lỗi.
3. `pnpm --filter @hr-copilot/api test` — toàn bộ pass (đặc biệt suite applications sau khi tách util).
4. Chạy app local, `POST /applications` cũ vẫn tạo file & chạy như trước (regression).
5. curl (cookie admin) `POST /admin/talent-pool/upload` nhiều file → list có entry, xem CV inline được.

**Phase 2:**
6. Upload 3 CV: 1 PDF text, 1 PDF scan (test OCR), 1 ảnh — profile trích đúng email/phone; name/skills có khi AI bật.
7. `AI_PROVIDER=disabled`: upload vẫn tạo entry, có email/phone (regex), name=tên file, status `COMPLETED` (không kẹt).
8. Upload kèm `targetJobId` → tạo Application + có `MatchResult` (AI bật). Promote entry pool thủ công → Application xuất hiện trong CandidateInbox.

**Phase 3:**
9. Từ UI admin: upload hàng loạt, xem list, sửa profile, xem CV, gán JD — end-to-end.

Ưu tiên dùng skill `/verify` hoặc `/run` để drive app thật, không chỉ test.

---

## Rủi ro & giảm thiểu (xếp hạng)

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| 1 | `ADD CONSTRAINT CHECK` full-scan khóa bảng live | Dùng `NOT VALID` + `VALIDATE` ở **migration riêng** (1.2). Row cũ thỏa sẵn. |
| 2 | Migration hỏng chặn container boot | Test trên DB giống prod trước khi deploy; review SQL tay. |
| 3 | NPE `openCandidateFile` khi gặp pool file | Sửa đọc owner đúng (1.6) + include `talentPoolEntry`. |
| 4 | Trùng file vật lý khi promote | v1: 2 CandidateFile cùng path; delete chỉ xóa file vật lý khi không owner nào khác trỏ tới. Tối ưu chia sẻ để sau. |
| 5 | Lệch route storage nếu đổi tiền tố path | GIỮ tiền tố `cv/`; KHÔNG sửa helper detect; có test. |
| 6 | Refactor util làm đổi hành vi applications | Di chuyển nguyên logic + chạy lại full test applications. |

## Ghi chú deploy (liên quan production)
- Thay đổi thuần additive/relaxing → **rolling deploy an toàn**: image cũ vẫn ghi `applicationId` non-null, thỏa CHECK mới. Không cần điều phối đặc biệt.
- Không thêm biến env bắt buộc. Tùy chọn `POOL_EXTRACTION_CONCURRENCY` (mặc định có).
- Docker CMD đã tự chạy `prisma migrate deploy` lúc boot ([apps/api/Dockerfile:23](../apps/api/Dockerfile#L23)).

## Thứ tự thực thi khuyến nghị
1. Phase 1 trọn vẹn (kể cả migration test + regression `POST /applications`) → deploy được ngay (pool CRUD, trích text+regex, chưa AI name/skills).
2. Phase 2 (AI) → bật khi Ollama sẵn sàng.
3. Phase 3 (UI).
