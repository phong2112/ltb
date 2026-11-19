-- Initial recruiting FAQ provided by HR for the career chatbot.
-- HR can edit or deactivate these entries at /admin/chats/knowledge.
INSERT INTO "ChatKnowledgeEntry" ("id", "category", "title", "content", "isActive", "sortOrder", "updatedAt") VALUES
(
  'faq_vsf_interview_process',
  'RECRUITMENT_PROCESS',
  'Quy trình phỏng vấn tại VSF như thế nào?',
  'Thông thường, quy trình phỏng vấn tại VSF gồm 01 vòng phỏng vấn, được tổ chức theo hình thức online và kéo dài khoảng 60 phút. Tùy theo tính chất của từng vị trí, quy trình có thể được điều chỉnh để phù hợp với yêu cầu tuyển dụng.',
  true, 10, CURRENT_TIMESTAMP
),
(
  'faq_vsf_salary_policy',
  'BENEFITS',
  'Mức lương cho vị trí đang tuyển là bao nhiêu?',
  'VSF không đề xuất khung lương cụ thể cho từng vị trí. Mức lương đề xuất sẽ được trao đổi trực tiếp với ứng viên sau buổi phỏng vấn, căn cứ trên năng lực, kinh nghiệm và kết quả đánh giá từ Hội đồng phỏng vấn.',
  true, 20, CURRENT_TIMESTAMP
),
(
  'faq_vsf_working_time_location',
  'COMPANY_POLICY',
  'Thời gian và địa điểm làm việc tại VSF như thế nào?',
  E'VSF hiện có văn phòng làm việc tại Hà Nội và TP. Hồ Chí Minh. Thông tin cụ thể như sau:\n\nVăn phòng Hà Nội:\n- Thời gian làm việc: Thứ Hai – Thứ Sáu, chấm công linh hoạt trong khung 08:30 – 09:30, đảm bảo đủ 08 giờ làm việc/ngày.\n- Thứ Bảy: Làm việc cách tuần theo hình thức remote.\n- Địa điểm: Technopark, Đa Tốn, Gia Lâm, Hà Nội.\n\nVăn phòng TP. Hồ Chí Minh:\n- Thời gian làm việc: Thứ Hai – Thứ Sáu, chấm công linh hoạt trong khung 08:30 – 09:00, nghỉ trưa từ 12:30 – 13:30 và đảm bảo đủ 08 giờ làm việc/ngày.\n- Thứ Bảy: Làm việc cách tuần theo hình thức remote.\n- Địa điểm: Vincom Đồng Khởi, Quận 1, TP. Hồ Chí Minh.',
  true, 30, CURRENT_TIMESTAMP
),
(
  'faq_vsf_cv_response_time',
  'RECRUITMENT_PROCESS',
  'Sau khi ứng tuyển, bao lâu tôi sẽ nhận được phản hồi về CV?',
  E'Đối với các vị trí đang có nhu cầu tuyển dụng, thời gian xem xét CV thông thường khoảng 01 tuần kể từ khi nhận được hồ sơ.\n\nTrong trường hợp CV chưa phù hợp với các vị trí hiện tại, thông tin ứng viên có thể được lưu trữ trong hệ thống dữ liệu tuyển dụng của VSF để xem xét khi phát sinh cơ hội phù hợp. Bộ phận Tuyển dụng sẽ chủ động liên hệ nếu có vị trí tương ứng với năng lực và kinh nghiệm của bạn.',
  true, 40, CURRENT_TIMESTAMP
),
(
  'faq_vsf_interview_result_time',
  'RECRUITMENT_PROCESS',
  'Sau phỏng vấn bao lâu sẽ có kết quả?',
  E'Thông thường, ứng viên sẽ nhận được thông báo kết quả phỏng vấn từ Bộ phận Tuyển dụng trong khoảng 02 – 05 ngày làm việc kể từ ngày phỏng vấn.\n\nTA sẽ chủ động liên hệ và cập nhật kết quả đến bạn qua thông tin liên hệ đã cung cấp.',
  true, 50, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
