# Clean Code Guide

Tài liệu này là tiêu chuẩn viết và review code cho toàn bộ monorepo. Mục tiêu là giữ code dễ đọc, dễ kiểm thử, dễ thay đổi và an toàn với dữ liệu ứng viên.

Khi có xung đột, ưu tiên theo thứ tự:

1. Yêu cầu sản phẩm và bảo mật trong `AGENTS.md`.
2. Kiến trúc và phạm vi trong `PLANNING.md`.
3. Quy ước đang được áp dụng nhất quán trong module hiện tại.
4. Các nguyên tắc trong tài liệu này.

## 1. Nguyên tắc chung

- Ưu tiên code đơn giản, rõ ràng hơn code ngắn nhưng khó hiểu.
- Mỗi file, module, class và function chỉ nên có một trách nhiệm chính.
- Tránh DRY cực đoan: chỉ trừu tượng hóa khi logic hoặc kiến thức nghiệp vụ thực sự giống nhau.
- Không tạo abstraction cho một trường hợp duy nhất nếu chưa làm code rõ hơn.
- Tách business logic khỏi UI, controller, database và nhà cung cấp bên thứ ba.
- Dùng guard clause và return sớm để giảm nesting.
- Không để magic number, magic string hoặc trạng thái tự do rải rác trong code.
- Không giữ dead code, import thừa, biến thừa hoặc code bị comment-out.
- Mỗi thay đổi phải nhỏ, đúng phạm vi và không reformat file không liên quan.

## 2. DRY và tái sử dụng

Trước khi thêm logic mới, tìm kiếm xem type, constant, helper, schema hoặc component tương đương đã tồn tại chưa.

Chỉ tách phần dùng chung khi:

- Được sử dụng ở ít nhất hai nơi; hoặc
- Là một khái niệm nghiệp vụ cốt lõi cần một nguồn định nghĩa duy nhất; hoặc
- Có khả năng sai lệch nghiêm trọng nếu các bản sao thay đổi độc lập.

Không gộp hai đoạn code chỉ vì chúng có hình thức giống nhau nhưng phục vụ quy tắc nghiệp vụ khác nhau.

Vị trí khai báo:

- Chỉ dùng trong một file: khai báo trong file đó.
- Dùng trong một feature/module: đặt cạnh feature, ví dụ `modules/jobs/job.constants.ts`.
- Dùng chung giữa nhiều module trong cùng app: đặt trong thư mục `common`, `lib` hoặc thư mục dùng chung hiện có của app.
- Dùng chung giữa web và API: đặt trong `packages/shared/src` và export qua public entry point.
- Model database và enum được Prisma quản lý: lấy từ Prisma Client; không tạo bản sao thủ công nếu không cần DTO riêng.

Không tạo file chung kiểu `utils.ts`, `types.ts` hoặc `constants.ts` quá lớn. Đặt tên theo domain, ví dụ:

```text
application-status.ts
job.constants.ts
candidate.types.ts
file-validation.ts
```

## 3. Giới hạn kích thước

Các giới hạn dưới đây là ngưỡng review, không phải lý do để tách code một cách máy móc:

- Function: mục tiêu không quá 30 dòng logic; từ 40 dòng trở lên phải xem xét tách nhỏ.
- React component: mục tiêu không quá 150 dòng; tách phần UI hoặc logic có trách nhiệm riêng.
- Service/class: mục tiêu không quá 300 dòng.
- File source code: mục tiêu không quá 300 dòng; từ 500 dòng trở lên phải tách, trừ file được sinh tự động hoặc dữ liệu tĩnh có lý do rõ ràng.
- Nesting: không quá 3 cấp; ưu tiên guard clause, helper có tên rõ ràng hoặc tách workflow.
- Tham số function: tối đa 3 tham số rời; nếu nhiều hơn, dùng object có type rõ ràng.

Không tính dòng import, type thuần, dữ liệu cấu hình khai báo rõ ràng hoặc code generated khi đánh giá độ dài function.

Ví dụ:

```ts
type CreateApplicationInput = {
  jobId: string;
  candidateEmail: string;
  candidatePhone?: string;
  consentAccepted: boolean;
};

function createApplication(input: CreateApplicationInput) {
  // ...
}
```

## 4. Naming convention

Tên phải mô tả ý nghĩa nghiệp vụ và hành vi, tránh viết tắt không phổ biến.

| Thành phần | Quy ước | Ví dụ |
| --- | --- | --- |
| Variable, function, method | `camelCase` | `normalizedEmail`, `calculateMatchScore` |
| Boolean | Tiền tố `is`, `has`, `can`, `should` | `isPublished`, `hasConsent` |
| Class, component, type, interface, enum | `PascalCase` | `ApplicationsService`, `CandidateSummary` |
| Constant bất biến toàn cục | `UPPER_SNAKE_CASE` | `MAX_CV_SIZE_BYTES` |
| File TypeScript thông thường | `kebab-case` theo pattern hiện tại | `cv-storage.service.ts` |
| React component file | Theo convention hiện tại của web app | `CandidateDetail.tsx` |
| Test file | Tên file nguồn + `.spec.ts`/`.test.tsx` | `jobs.service.spec.ts` |

Quy tắc đặt tên function:

- Dùng động từ thể hiện hành vi: `createJob`, `findCandidateByEmail`, `validateCvFile`.
- Function trả boolean phải đọc như một câu hỏi: `isJobPublished`, `canViewCandidateFile`.
- Function xử lý event dùng `handle...`: `handleStatusChange`.
- Không dùng tên mơ hồ như `processData`, `handleStuff`, `doAction`, `temp`, `value1`.
- Không thêm hậu tố `Util`, `Helper`, `Manager` nếu tên domain cụ thể hơn có thể mô tả trách nhiệm.
- Không dùng cùng một từ cho nhiều ý nghĩa khác nhau trong cùng domain.

## 5. Type, model, constant và enum

- Không dùng `any`. Dùng `unknown` ở boundary rồi validate/narrow về type cụ thể.
- Không khai báo cùng một union, enum, DTO shape hoặc constant ở nhiều nơi.
- DTO/API schema, domain model và database model là các lớp khác nhau; chỉ dùng chung khi chúng thực sự có cùng contract.
- Dùng `type` cho union, intersection và object data; dùng `interface` khi cần contract có khả năng mở rộng/implement. Giữ nhất quán trong cùng module.
- Ưu tiên string union hoặc `as const` cho UI-only state nhỏ; dùng Prisma enum cho trạng thái được lưu trong database.
- Không dùng TypeScript numeric enum.
- Constant phải có đơn vị trong tên khi có thể: `SIGNED_URL_TTL_SECONDS`, `MAX_CV_SIZE_BYTES`.
- Giá trị môi trường phải đi qua config đã validate, không đọc `process.env` rải rác.
- Không export nội bộ chỉ để “có thể tái sử dụng sau này”. Chỉ export public contract cần thiết.

Ví dụ:

```ts
export const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CV_EXTENSIONS = ["pdf", "doc", "docx"] as const;

export type AllowedCvExtension = (typeof ALLOWED_CV_EXTENSIONS)[number];
```

## 6. Function và control flow

- Một function chỉ thực hiện một mức abstraction chính.
- Tách validate, transform, persistence và side effect thành trách nhiệm rõ ràng.
- Ưu tiên pure function cho normalize, map, filter, calculate và format.
- Không mutate input nếu tên function không thể hiện rõ việc mutation.
- Không dùng boolean argument khó hiểu như `saveCandidate(data, true)`; dùng options object hoặc function riêng.
- Không bắt lỗi rồi bỏ qua. Hoặc xử lý đầy đủ, hoặc thêm context an toàn và throw lại.
- Với async code, luôn `await`, return hoặc xử lý Promise; không để floating Promise.
- Chỉ chạy song song các tác vụ độc lập và phải xác định cách xử lý lỗi.

```ts
function getPublishedJob(job: Job | null): Job {
  if (!job) {
    throw new JobNotFoundError();
  }

  if (!job.isPublished) {
    throw new JobNotPublishedError();
  }

  return job;
}
```

## 7. Module và dependency

- Dependency đi từ lớp ngoài vào contract/domain rõ ràng; business logic không phụ thuộc trực tiếp vào UI.
- NestJS controller chỉ nhận request, validate input, gọi service và trả response.
- Service chứa use case/business logic; Prisma/storage/AI/email phải nằm sau service hoặc provider phù hợp.
- React page chịu trách nhiệm composition; UI lặp lại tách thành component, stateful logic lặp lại tách thành hook.
- Không gọi private API trực tiếp từ unauthenticated client code.
- Tránh circular dependency và barrel export quá rộng.
- Import qua public API của package/module; không import sâu vào implementation của package khác.
- Inject thời gian, random, AI, storage hoặc network client khi cần test ổn định.

## 8. Error handling và logging

- Validate input tại boundary: HTTP request, form, environment, file upload, queue payload và AI response.
- Dùng error có type hoặc exception phù hợp; không throw string.
- Error trả cho client phải rõ nhưng không làm lộ stack trace, secret hoặc thông tin nội bộ.
- Log đủ context để điều tra bằng ID và trạng thái, không log toàn bộ CV, token, mật khẩu hoặc dữ liệu cá nhân không cần thiết.
- Phân biệt lỗi có thể retry với lỗi validation hoặc lỗi nghiệp vụ không nên retry.
- UI phải có loading, empty, success và error state phù hợp.

## 9. Database và side effect

- Dùng transaction khi một use case có nhiều thay đổi database bắt buộc thành công hoặc thất bại cùng nhau.
- Không query trong loop nếu có thể batch/include/select rõ ràng.
- Chỉ select dữ liệu cần thiết, đặc biệt với dữ liệu ứng viên.
- Không hard-delete dữ liệu tuyển dụng nếu workflow yêu cầu audit hoặc archive.
- API nhận request lặp lại hoặc queue retry phải được thiết kế idempotent khi thực tế có thể xảy ra.
- Side effect như email, AI parsing và file processing không được giữ HTTP request lâu; enqueue background job khi phù hợp.

## 10. React/UI

- Component chỉ nên có một vai trò UI chính.
- Không đặt business rule trong JSX.
- Derived state được tính từ props/state hiện có; không lưu thêm state nếu không cần.
- Không dùng `useEffect` cho giá trị có thể tính trong render hoặc event handler.
- List phải có key ổn định từ dữ liệu, không dùng index nếu thứ tự có thể thay đổi.
- Form phải validate ở cả client và server; server là nguồn quyết định cuối cùng.
- Mọi control tương tác phải có label, keyboard access và trạng thái disabled/loading rõ ràng.
- Không tạo component wrapper nếu nó không bổ sung hành vi, semantic hoặc tái sử dụng thực tế.

## 11. Comment và documentation

- Code nên giải thích “làm gì”; comment chỉ giải thích “tại sao” khi quyết định không hiển nhiên.
- Không viết comment lặp lại đúng nội dung code.
- TODO phải có ngữ cảnh và điều kiện hoàn thành; thêm issue/reference nếu có.
- Public contract, security-sensitive flow và workaround phải được document ngắn gọn.
- Khi đổi environment variable, architecture, schema, setup hoặc deployment, cập nhật tài liệu liên quan trong cùng thay đổi.

## 12. Testability và testing

- Test hành vi quan sát được, không phụ thuộc implementation detail.
- Unit test business rule, validation, normalization và status transition.
- Integration test endpoint và database flow quan trọng khi thực tế.
- Mock tại boundary như AI, email, storage và external API; không mock mọi function nội bộ.
- Test phải độc lập, có dữ liệu rõ ràng và không phụ thuộc thứ tự chạy.
- Mỗi bug fix nên có regression test nếu có thể tái hiện tự động.
- Không giảm assertion hoặc bỏ test chỉ để pipeline pass.

## 13. Security và dữ liệu nhạy cảm

- Không commit secret, credential hoặc dữ liệu ứng viên thật.
- Không log nội dung CV đầy đủ, access token, password hoặc signed URL.
- CV phải private; chỉ tạo signed URL ngắn hạn sau khi kiểm tra quyền.
- Validate cả extension, MIME type, kích thước và file signature khi xử lý upload.
- Không đưa dữ liệu cá nhân không cần thiết vào prompt AI hoặc dịch vụ bên thứ ba.
- Không render rich text chưa sanitize.
- Mọi admin route/API phải được bảo vệ; public form phải rate-limit và có consent.

## 14. Quy tắc review và hoàn thành

Trước khi tạo PR hoặc báo hoàn thành:

- [ ] Không có logic, type, constant hoặc enum bị duplicate không có lý do.
- [ ] Tên file, function, variable và type mô tả đúng ý nghĩa.
- [ ] File/function vượt ngưỡng đã được tách hoặc có lý do hợp lý.
- [ ] Không có `any`, magic value, dead code hoặc floating Promise mới.
- [ ] Boundary input đã được validate và error được xử lý rõ ràng.
- [ ] Dữ liệu ứng viên, CV, token và secret không bị lộ qua log/API/UI.
- [ ] Business logic quan trọng có test phù hợp.
- [ ] Đã chạy các script liên quan có thật trong `package.json` (`lint`, `test`, `build`).
- [ ] Đã kiểm tra diff để không sửa hoặc reformat ngoài phạm vi.
- [ ] Tài liệu và `.env.example` đã được cập nhật nếu contract/config thay đổi.

## 15. Khi nào nên refactor

Refactor trong cùng thay đổi khi code gây cản trở trực tiếp cho feature/bug đang làm, ví dụ:

- Cần sửa cùng một business rule ở nhiều nơi.
- Function trộn validation, database, transformation và side effect.
- Tên hiện tại làm thay đổi mới dễ sai hoặc khó review.
- File vượt ngưỡng và chứa nhiều trách nhiệm độc lập.

Không mở rộng refactor sang module không liên quan. Nếu refactor lớn, tách thành thay đổi riêng để dễ review và rollback.
