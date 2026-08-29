# Plan: Quản trị theo dõi hành vi và vấn đề người dùng

## 1. Mục tiêu

Xây dựng một khu vực quản trị tại `/admin/analytics` để TA/quản trị viên có thể:

- Biết nhóm người dùng đang sử dụng những tính năng nào và tần suất sử dụng.
- Theo dõi hành trình chính, đặc biệt từ xem việc làm đến nộp hồ sơ thành công.
- Phát hiện thao tác thất bại, lỗi giao diện/API và điểm người dùng thường bỏ dở.
- Lọc dữ liệu theo thời gian, nhóm người dùng, tính năng và kết quả thao tác.
- Vận hành hệ thống dựa trên dữ liệu mà không thu thập nội dung CV, nội dung form, tin nhắn hoặc dữ liệu cá nhân không cần thiết.

Kế hoạch ưu tiên giải pháp first-party dùng PostgreSQL hiện tại. MVP không phụ thuộc nền tảng analytics bên thứ ba và không biến sản phẩm thành hệ thống giám sát phiên làm việc.

## 2. Phạm vi

### Trong phạm vi MVP

- Theo dõi hành vi trên career site của khách/ứng viên ở mức phiên ẩn danh.
- Theo dõi hành vi của TA đã đăng nhập bằng danh tính lấy từ JWT phía server.
- Thu thập page view theo route template, hành động tính năng, kết quả thành công/thất bại, lỗi validation và lỗi kỹ thuật đã chuẩn hóa.
- Tổng hợp các KPI, tính năng được dùng nhiều, tỷ lệ lỗi và funnel ứng tuyển.
- Trang quản trị analytics có bộ lọc và trạng thái loading/empty/error rõ ràng.
- Chính sách lưu giữ, xóa dữ liệu, giới hạn payload, rate limit và danh sách thuộc tính được phép.
- Feature flag để bật/tắt thu thập và dashboard mà không ảnh hưởng luồng nghiệp vụ.

### Ngoài phạm vi MVP

- Ghi lại màn hình, heatmap, keystroke hoặc nội dung người dùng nhập.
- Theo dõi quảng cáo, attribution đa kênh hoặc chia sẻ dữ liệu hành vi cho bên thứ ba.
- Phân tích nội dung CV/tin nhắn/ghi chú để suy luận vấn đề người dùng.
- Theo dõi người dùng công khai xuyên thiết bị hoặc nhận dạng bằng fingerprint.
- Alert realtime, data warehouse/BI riêng, machine learning dự đoán churn.
- Phân quyền analytics nhiều cấp; hệ thống hiện chỉ có một tài khoản TA cố định.

## 3. Quyết định và giả định sản phẩm

| Nội dung | Trạng thái | Quyết định / hành vi fallback |
| --- | --- | --- |
| Mục tiêu thu thập | Đã xác nhận | Đo tính năng hay dùng và vấn đề người dùng gặp để quản trị hệ thống. |
| Nhóm người dùng | Giả định MVP | Bao gồm khách/ứng viên công khai và TA đăng nhập; dashboard luôn cho phép tách hai nhóm. |
| Định danh khách công khai | Khuyến nghị | Chỉ dùng ID phiên ngẫu nhiên trong `sessionStorage`, hash tại server; không dùng cookie analytics bền vững hoặc fingerprint. Nếu storage không khả dụng, vẫn nhận event không có session và không chặn người dùng. |
| Định danh TA | Khuyến nghị | Server lấy `sub` từ JWT; không tin `actorId` do client gửi. Với kiến trúc hiện tại giá trị là `hr-admin`. |
| Mức chi tiết | Khuyến nghị | Thu sự kiện semantic và mã lỗi; không thu DOM snapshot, text tự do, nội dung form, email, điện thoại, CV, tin nhắn hay query string có thể chứa PII. |
| Nguồn sự thật | Khuyến nghị | Backend ghi nhận kết quả nghiệp vụ/API; frontend chỉ ghi page view, UI interaction, client validation và lỗi runtime. Dùng `eventId`/`requestId` để tránh đếm trùng. |
| Lưu giữ | Khuyến nghị | Raw event tối đa 90 ngày, phù hợp nội dung “Nhật ký kỹ thuật” hiện có; aggregate không định danh giữ 12 tháng. Nếu chưa có aggregate thì xóa raw sau 90 ngày. |
| Khi analytics lỗi | Khuyến nghị | Fail-open: bỏ qua hoặc retry có giới hạn; tuyệt đối không làm chậm/chặn xem job, nộp hồ sơ hay thao tác admin. |
| Dịch vụ bên thứ ba | Khuyến nghị MVP | Không dùng; có thể đánh giá sau khi volume và nhu cầu vượt khả năng dashboard nội bộ. |

Trước khi production, product owner cần xác nhận phạm vi “người dùng” và thời hạn aggregate 12 tháng. Việc này không cản trở xây dựng schema/taxonomy theo hướng bảo vệ riêng tư ở trên.

## 4. Hiện trạng và khoảng trống

### Bằng chứng từ repository

- `packages/db/prisma/schema.prisma` đã có `ActivityLog`, nhưng model này gắn với `Candidate`, `Application`, `Job`, `CandidateFile` và đang dùng cho audit nghiệp vụ như `application_submitted`, `candidate_file_viewed`, `candidate_message_sent`, AI processing. Không nên tái sử dụng để chứa page view/UI event.
- `apps/api/src/modules/applications/service/index.service.ts`, `apps/api/src/modules/candidates/service/index.service.ts` và các service AI/file đã ghi `ActivityLog` ở các điểm nghiệp vụ quan trọng.
- `apps/api/src/modules/auth/guards/index.guard.ts` đưa `request.user` từ JWT vào request; đây là nguồn xác thực actor cho event của admin.
- `apps/web/src/app/apis/requests/client.ts` là wrapper chung cho API, phù hợp để gắn `X-Request-Id`, đo duration và phát sinh event lỗi đã chuẩn hóa.
- `apps/web/src/app/routers/index.tsx` là điểm tập trung route React Router, phù hợp để theo dõi page view theo route template thay vì URL thô.
- `apps/web/src/app/pages/admin/AdminDashboard/index.tsx` hiện là dashboard nghiệp vụ tuyển dụng lấy dữ liệu từ `useData`; chưa có API/dashboard analytics riêng.
- `apps/web/src/app/layouts/AdminLayout.tsx` định nghĩa menu quản trị; sẽ thêm mục Analytics/Hoạt động hệ thống tại đây.
- `apps/api/src/main.ts` chưa có request ID middleware, telemetry interceptor hoặc global runtime error reporting.
- `apps/web/src/app/pages/client/Privacy/constants/index.ts` đã nói page/time được phân tích ở dạng tổng hợp, ẩn danh và technical log xóa sau 90 ngày; cần cập nhật mô tả cho đúng implementation cuối cùng.

### Khoảng trống

- Chưa có schema event, taxonomy/version, session ẩn danh và chống trùng.
- Chưa có API ingest, API báo cáo, retention job hoặc aggregate.
- Chưa có instrumentation nhất quán cho route, action, validation và lỗi.
- Chưa có dashboard để xem mức sử dụng, funnel và vấn đề.
- `ActivityLog` hiện không liên kết trực tiếp với `User`; model `User` cũng chưa phải nguồn đăng nhập thực tế vì auth đang lấy admin từ env. Analytics phải tôn trọng thực tế này, không giả định đã có multi-user.

## 5. Thiết kế đề xuất

### 5.1. Tách hai loại nhật ký

- Giữ nguyên `ActivityLog` làm audit trail nghiệp vụ và dữ liệu nhạy cảm: ai xem/tải CV, đổi trạng thái, gửi tin nhắn, chạy AI.
- Tạo `ProductEvent` riêng cho product analytics: route, feature, outcome, duration, error code và metadata đã allowlist.
- Khi một thao tác vừa cần audit vừa cần analytics, service nghiệp vụ tiếp tục ghi `ActivityLog`; telemetry chỉ ghi kết quả tổng quát, không sao chép dữ liệu ứng viên.

### 5.2. Taxonomy sự kiện

Tên event dùng `snake_case`, có version và chỉ được chọn từ registry dùng chung. Không cho client gửi tên tùy ý.

| Event | Nguồn | Dùng để đo | Thuộc tính được phép tiêu biểu |
| --- | --- | --- | --- |
| `page_viewed` | Web | Trang/route được dùng | `routeTemplate`, `audience`, `referrerType` nội bộ/ngoài/không có |
| `feature_action_started` | Web | Ý định dùng tính năng | `feature`, `action`, `surface` |
| `feature_action_completed` | API/service | Sử dụng thành công | `feature`, `action`, `durationBucket`, `entityType` không kèm entity ID nhạy cảm |
| `feature_action_failed` | API/service | Vấn đề nghiệp vụ/kỹ thuật | `feature`, `action`, `errorCode`, `httpStatus`, `durationBucket` |
| `form_validation_failed` | Web | Điểm vướng trước khi gọi API | `formId`, `fieldCodes[]`, `errorCodes[]`; không gửi value/message tự do |
| `client_error_occurred` | Web | Lỗi render/runtime | `errorCode` hoặc fingerprint từ stack đã scrub, `routeTemplate`, `release`; không gửi raw props/state |
| `application_funnel_step` | Web/API | Funnel ứng tuyển | `step`: `job_viewed`, `apply_started`, `cv_selected`, `submit_attempted`, `submitted` |
| `search_performed` | Web | Mức dùng tìm kiếm/bộ lọc | `feature`, `filterKeys[]`, `hasQuery`; không gửi nội dung query |

Registry ban đầu nên bao phủ các feature hiện có: `jobs`, `job_detail`, `application`, `candidate_inbox`, `candidate_detail`, `cv_preview`, `cv_export`, `ai_analysis`, `follow_up`, `templates`, `sourcing`, `chat`, `settings`, `auth`.

Nguyên tắc đếm:

- “Tính năng được dùng” mặc định dựa trên `feature_action_completed`, không dựa trên click.
- “Vấn đề” gồm `feature_action_failed`, `form_validation_failed` và `client_error_occurred`, hiển thị tách loại.
- Một request chỉ sinh tối đa một event kết quả. `eventId` do client tạo hoặc `requestId` phía server là khóa idempotency.
- Page view dùng route template như `/jobs/:id`, không lưu path chứa ID hoặc query string thô.

### 5.3. Dữ liệu

Thêm vào `packages/db/prisma/schema.prisma`:

`ProductEvent`:

- `id`: cuid/UUID.
- `eventId`: ID idempotency duy nhất.
- `schemaVersion`: phiên bản payload, mặc định `1`.
- `eventName`, `category`, `source`, `actorType`, `outcome`: enum hoặc string được validate qua registry.
- `actorUserId`: nullable; chỉ server điền từ JWT cho admin.
- `anonymousSessionHash`: nullable; HMAC server của session ID công khai, không lưu token gốc.
- `tenantSlug`: nullable, lấy từ header đã chuẩn hóa để tương thích route tenant hiện tại.
- `feature`, `action`, `surface`, `routeTemplate`: nullable và có giới hạn chiều dài.
- `errorCode`, `httpStatus`, `durationMs`: nullable; duration phải có giới hạn hợp lệ.
- `requestId`, `release`: nullable.
- `properties`: JSON chỉ chứa key/value đã allowlist theo từng event.
- `occurredAt`, `receivedAt`.

Index tối thiểu:

- Unique `eventId`.
- `(receivedAt)`, `(eventName, receivedAt)`, `(feature, receivedAt)`, `(actorType, receivedAt)`, `(outcome, receivedAt)`, `(errorCode, receivedAt)`.
- Không thêm index JSON ở MVP nếu chưa có query thực tế chứng minh cần thiết.

`ProductEventDailyAggregate` (phase sau khi raw event chạy ổn định):

- Khóa theo `date + actorType + eventName + feature + action + outcome + errorCode`.
- `eventCount`, `sessionCount`; aggregate không chứa user/session hash.
- Upsert idempotent theo ngày; dashboard ưu tiên aggregate cho khoảng thời gian dài và raw cho cửa sổ gần.

Tạo migration mới, không sửa migration cũ. Không backfill `ActivityLog` sang `ProductEvent`, vì hai loại log có mục đích và semantics khác nhau.

### 5.4. Backend/API

Tạo `AnalyticsModule` theo convention NestJS hiện tại và đăng ký trong `apps/api/src/modules/app.module.ts`.

Endpoint ingestion:

- `POST /analytics/events/batch`: nhận tối đa 20 event/lần, giới hạn payload tổng và rate limit theo IP/session; auth là optional để phục vụ cả public và admin.
- DTO dùng `class-validator`, reject unknown field và validate registry/allowlist.
- Actor, tenant, request context do server chuẩn hóa. Client không được nâng actor thành admin.
- Trả `202` hoặc `204`; duplicate `eventId` được coi là thành công idempotent.
- Không log toàn bộ payload khi validation/DB lỗi.

Endpoint quản trị, tất cả dùng `JwtAuthGuard`:

- `GET /admin/analytics/overview?from&to&actorType&feature`
- `GET /admin/analytics/features?from&to&actorType`
- `GET /admin/analytics/issues?from&to&actorType&feature`
- `GET /admin/analytics/funnels/application?from&to`
- `GET /admin/analytics/events?...` chỉ dùng khi cần drill-down; phân trang cursor, response không có session hash/actor email/properties ngoài allowlist.

Response phải trả dữ liệu đã tổng hợp và mốc thời gian UTC; frontend render theo timezone cấu hình/người dùng. Giới hạn date range (đề xuất 90 ngày với raw, 12 tháng với aggregate).

Thành phần hỗ trợ:

- Request ID middleware/interceptor: nhận hoặc sinh ID an toàn, trả `X-Request-Id`.
- `AnalyticsService.recordServerEvent()` để service nghiệp vụ ghi event thành công/thất bại nhất quán.
- Ghi bất đồng bộ/best-effort. Nếu DB analytics lỗi, log mã lỗi kỹ thuật ngắn gọn và không rollback transaction nghiệp vụ.
- Job retention chạy theo lịch hiện hữu phù hợp; nếu chưa có scheduler, cung cấp service/CLI idempotent để deployment gọi hàng ngày. Xóa raw event quá 90 ngày sau khi aggregate hoàn tất.

### 5.5. Frontend instrumentation

Thêm một analytics client nhỏ, không đưa SDK bên thứ ba vào bundle:

- Queue in-memory, batch theo số lượng/thời gian, flush bằng `fetch`; dùng `sendBeacon` khi phù hợp lúc rời trang.
- Không retry vô hạn; giới hạn queue và bỏ event cũ khi offline lâu.
- `track(eventName, payload)` chỉ nhận typed event từ registry dùng chung.
- Tôn trọng `VITE_ANALYTICS_ENABLED`; khi tắt, hàm là no-op.
- Session ID ngẫu nhiên nằm trong `sessionStorage`; không dùng fingerprint.

Điểm tích hợp:

- Router observer tại `apps/web/src/app/routers/index.tsx` ghi `page_viewed` sau navigation thành công.
- `apps/web/src/app/apis/requests/client.ts` gắn request ID, duration và báo lỗi API bằng mã/path template; không gửi response body hoặc message có thể chứa PII.
- Error Boundary quanh app và listener `error`/`unhandledrejection` đã scrub cho `client_error_occurred`.
- Instrument semantic tại các điểm chính thay vì bắt mọi click: xem job, mở apply, validation fail, submit application, tìm/lọc candidate, xem CV, retry AI, gửi chat/follow-up, tạo/publish job, sourcing.
- Backend là nguồn xác nhận cho action hoàn tất; frontend không phát lại `completed` nếu response tương ứng đã được server ghi.

### 5.6. Trang quản trị

Thêm route `/admin/analytics`, lazy page và mục menu “Phân tích sử dụng” trong `AdminLayout`.

Màn hình ưu tiên dày, dễ quét và phục vụ quyết định:

1. Header và filter: khoảng ngày (7/30/90), nhóm `Public/Admin`, feature, refresh.
2. KPI: số phiên, tổng action thành công, tỷ lệ lỗi, số feature active.
3. “Tính năng được dùng nhiều”: bảng xếp hạng theo completed action, unique session, xu hướng so với kỳ trước.
4. “Vấn đề nổi bật”: error code, feature/action, số lần, số phiên ảnh hưởng, lần gần nhất và tỷ lệ lỗi.
5. Funnel ứng tuyển: xem job → bắt đầu apply → submit attempt → thành công; hiển thị tỷ lệ rơi giữa từng bước.
6. Xu hướng theo ngày và bảng event gần đây đã được làm sạch để drill-down.

Mỗi widget có loading, empty, error và retry riêng. Không trộn các KPI này vào `AdminDashboard` ở MVP; có thể thêm một shortcut/cảnh báo tổng quan sau khi số liệu ổn định.

## 6. Các giai đoạn triển khai

### Phase 0 — Chốt measurement contract và privacy

Công việc:

- Chốt hai audience, taxonomy, feature/action registry, error code và funnel.
- Lập bảng allowlist/denylist properties cho từng event.
- Chốt retention raw/aggregate và nội dung disclosure.
- Ghi event contract trong package shared hoặc tài liệu gần code.

Validation:

- Review từng event với câu hỏi quản trị mà event trả lời.
- Dùng payload mẫu để chứng minh không chứa họ tên, email, số điện thoại, CV, note, chat, URL/query thô.

Tiêu chí hoàn tất: frontend và backend dùng chung tên, version và định nghĩa metric; không còn event “catch-all” metadata tự do.

### Phase 1 — Persistence và API analytics

Công việc:

- Thêm Prisma models/enums/indexes và migration.
- Tạo `AnalyticsModule`, DTO, service, public batch controller và admin report controller.
- Thêm auth derivation, HMAC session, idempotency, validation, rate limit và date-range guard.
- Thêm request ID và các query tổng hợp cho overview/features/issues/funnel.

Validation:

- Migration chạy trên DB trống và DB có dữ liệu hiện hữu.
- Contract/integration test cho ingest public, ingest admin, duplicate, payload xấu, PII key, rate limit và admin authorization.
- `ActivityLog` hiện hữu và các API tuyển dụng không thay đổi hành vi.

Tiêu chí hoàn tất: có thể gửi tập event hợp lệ và đọc báo cáo qua API admin; event lỗi không làm lỗi request nghiệp vụ.

### Phase 2 — Instrumentation web và server

Công việc:

- Xây typed analytics client, queue, session và feature flag.
- Instrument route, API error, error boundary, form validation và các hành động ưu tiên.
- Ghi server event tại điểm nghiệp vụ thành công/thất bại; chuẩn hóa error code thay vì dùng error message.
- Bổ sung release/app version để phân biệt regression sau deploy.

Validation:

- Chạy manual journey public và admin, đối chiếu sequence event với taxonomy.
- Mất mạng hoặc analytics API trả 500 không ảnh hưởng hành trình chính.
- Kiểm tra Network/DB không có giá trị form, nội dung CV/chat/note hay raw URL nhạy cảm.

Tiêu chí hoàn tất: các câu hỏi “feature nào được dùng” và “lỗi nào đang ảnh hưởng” có dữ liệu tin cậy, không đếm đôi.

### Phase 3 — Dashboard quản trị

Công việc:

- Thêm request/models/mappers cho analytics theo cấu trúc `apps/web/src/app/apis`.
- Tạo trang, route, menu, filter và các widget đã nêu.
- Đồng bộ filter vào query string để có thể bookmark/share trong phiên admin.
- Thêm i18n Việt/Anh theo convention hiện có.

Validation:

- Test các khoảng ngày, audience, feature và dữ liệu rỗng/lỗi.
- So khớp số tổng trên UI với API/SQL fixture.
- Kiểm tra mobile, keyboard, focus, label và overflow.

Tiêu chí hoàn tất: admin tự xác định top feature, top issue và bước rơi lớn nhất trong funnel mà không truy cập DB.

### Phase 4 — Retention, rollout và vận hành

Công việc:

- Thêm daily aggregate và cleanup idempotent.
- Cập nhật `.env.example`, README/deployment và Privacy page Việt/Anh.
- Bật feature flag theo môi trường: local/staging trước, production sau.
- Theo dõi volume, latency, tỷ lệ event bị reject/drop và dung lượng DB.

Validation:

- Dry-run cleanup báo đúng số record; test aggregate trước-xóa vẫn giữ đúng KPI.
- Rollback bằng feature flag dừng ingest/instrumentation nhưng không ảnh hưởng app.
- Kiểm tra dashboard chỉ truy cập được sau auth.

Tiêu chí hoàn tất: production có retention tự động, tài liệu minh bạch và quy trình tắt/rollback rõ ràng.

## 7. Ma trận test trọng tâm

| Kịch bản | Kỳ vọng |
| --- | --- |
| Khách xem `/jobs/:id` | Một `page_viewed` với route template; không chứa job title, raw URL hoặc query. |
| Khách mở form rồi nộp thành công | Funnel theo đúng thứ tự; `submitted` chỉ tính khi backend commit thành công. |
| Form thiếu email/phone | Có `form_validation_failed` với field/error code, không có giá trị người dùng nhập. |
| API nộp hồ sơ trả 409/429/500 | Có failed event chuẩn hóa; form vẫn hiển thị lỗi như trước; không ghi response body. |
| Admin xem/tải CV | `ActivityLog` audit vẫn được ghi; analytics chỉ ghi feature/action/outcome không có file/candidate ID. |
| Admin tạo hoặc publish job | Một completed/failed event từ backend, không đếm đôi từ client. |
| Analytics endpoint unavailable | Luồng xem job/nộp hồ sơ/admin tiếp tục hoạt động; queue không tăng vô hạn. |
| Client gửi `actorType=ADMIN` khi chưa auth | Server hạ về public hoặc reject theo contract; không tạo event admin giả. |
| Client gửi key `email`, `phone`, `cvText` | Payload bị reject/scrub theo policy và có metric nội bộ về event không hợp lệ. |
| Gửi lại cùng `eventId` | Chỉ có một record, response vẫn idempotent. |
| User chưa đăng nhập gọi report API | Trả 401. |
| Khoảng ngày quá giới hạn | Trả 400 với thông báo rõ ràng. |
| Cleanup 90 ngày | Chỉ xóa raw đã quá hạn và đã aggregate; audit `ActivityLog` không bị tác động. |
| Filter dashboard | Tổng KPI, bảng feature, issues và funnel dùng cùng timezone/range. |

## 8. Observability, bảo mật và khả năng đảo ngược

- Metrics vận hành: số event accepted/rejected/duplicate/dropped, ingest latency, report latency, cleanup count, DB size.
- Không ghi raw event payload vào application log; chỉ ghi event ID, schema version và error code cần thiết.
- Không trả session hash/actor ID trong API dashboard nếu widget không cần.
- Rate limit riêng cho public ingestion; giới hạn batch, chuỗi, mảng, timestamp lệch và JSON depth.
- HMAC salt/secret là env server-only, được validate lúc startup và không dùng `NEXT_PUBLIC_*`/`VITE_*`.
- Feature flags đề xuất: `ANALYTICS_ENABLED`, `ANALYTICS_ADMIN_ENABLED`, `VITE_ANALYTICS_ENABLED`, `ANALYTICS_HMAC_SECRET`, `ANALYTICS_RAW_RETENTION_DAYS`.
- Tắt flags là đường rollback chính. Migration thêm bảng là backward-compatible; giữ bảng khi rollback app để tránh thao tác phá hủy, xóa sau bằng migration riêng khi đã xác nhận.
- Dashboard báo rõ “dữ liệu từ ngày bắt đầu thu thập”, không suy diễn số liệu lịch sử từ `ActivityLog`.

## 9. Rủi ro và câu hỏi còn mở

- “Người dùng” có thể chỉ TA hoặc gồm cả ứng viên. Plan mặc định gồm cả hai nhưng tách audience; cần xác nhận trước khi bật production.
- Public session-level analytics dù không có PII vẫn là dữ liệu hành vi giả danh; cần review privacy/legal trước production và bảo đảm copy không gọi là “hoàn toàn ẩn danh” khi raw session hash còn tồn tại.
- Một instance PostgreSQL vừa lưu nghiệp vụ nhạy cảm vừa lưu event có thể tăng nhanh. Cần đo volume 2–4 tuần trước khi quyết định partition, ClickHouse hoặc nền tảng analytics riêng.
- Lỗi runtime có stack trace dễ chứa URL/dữ liệu động. Phải scrub và fingerprint tại client/server trước khi persistence.
- Một TA duy nhất làm metric “active users” của admin ít ý nghĩa; dashboard nên ưu tiên action count, success rate và vấn đề thay vì DAU/MAU admin.

## 10. Definition of Done

- `/admin/analytics` được bảo vệ bằng auth và hiển thị đúng usage, issues, funnel theo filter.
- Các luồng ưu tiên tạo event theo registry, có version, không đếm đôi và không ảnh hưởng luồng chính khi analytics lỗi.
- Không có CV, form value, email, phone, tin nhắn, ghi chú hoặc raw URL/query trong `ProductEvent`.
- `ActivityLog` audit hiện tại không bị thay đổi semantics hoặc retention.
- Có migration, unit/integration tests, manual end-to-end verification, feature flags, retention và rollback procedure.
- Privacy, `.env.example`, setup/deployment documentation phản ánh đúng dữ liệu thu thập và thời hạn lưu giữ.
- Chạy thành công các script hiện có: `pnpm lint`, `pnpm test`, `pnpm build`; nếu môi trường không cho chạy phải ghi rõ lý do trong bàn giao.
