import { notificationService, type ActionNotification } from "./notification.service";

export async function runNotifiedAction<T>(messages: ActionNotification, action: () => Promise<T>): Promise<T> {
  const notificationId = notificationService.loading(messages.loading);
  try {
    const result = await action();
    notificationService.success(messages.success, notificationId);
    return result;
  } catch (error) {
    notificationService.error(error, messages.error, notificationId);
    throw error;
  }
}

export const actionNotifications = {
  auth: {
    login: { loading: "Đang đăng nhập...", success: "Đăng nhập thành công", error: "Không thể đăng nhập" },
    logout: { loading: "Đang đăng xuất...", success: "Đã đăng xuất", error: "Không thể kết nối máy chủ khi đăng xuất" },
  },
  applications: {
    submit: { loading: "Đang gửi hồ sơ ứng tuyển...", success: "Hồ sơ đã được gửi thành công", error: "Không thể gửi hồ sơ ứng tuyển" },
  },
  jobs: {
    create: { loading: "Đang tạo vị trí tuyển dụng...", success: "Đã tạo vị trí tuyển dụng", error: "Không thể tạo vị trí tuyển dụng" },
    update: { loading: "Đang cập nhật vị trí...", success: "Đã cập nhật vị trí tuyển dụng", error: "Không thể cập nhật vị trí tuyển dụng" },
  },
  candidates: {
    retryAnalysis: { loading: "Đang chạy lại phân tích AI...", success: "Đã đưa hồ sơ vào hàng đợi AI", error: "Không thể chạy lại phân tích AI" },
    update: { loading: "Đang cập nhật ứng viên...", success: "Đã cập nhật thông tin ứng viên", error: "Không thể cập nhật ứng viên" },
    delete: { loading: "Đang xóa ứng viên...", success: "Đã xóa ứng viên", error: "Không thể xóa ứng viên" },
  },
  sourcing: {
    updateCampaign: { loading: "Đang cập nhật chiến dịch...", success: "Đã cập nhật chiến dịch", error: "Không thể cập nhật chiến dịch" },
    createCampaign: { loading: "Đang tạo bộ tìm kiếm đa nguồn...", success: "Đã tạo chiến dịch sourcing", error: "Không thể tạo chiến dịch sourcing" },
    importProfiles: { loading: "Đang thêm hồ sơ sourcing...", success: "Đã cập nhật danh sách ứng viên", error: "Không thể thêm hồ sơ sourcing" },
    discoverLinkedin: { loading: "Đang tìm ứng viên LinkedIn từ JD...", success: "Đã cập nhật shortlist LinkedIn", error: "Không thể chạy LinkedIn discovery" },
    runOrchestration: { loading: "Đang xếp sourcing orchestration...", success: "Workflow sourcing đã được xếp hàng", error: "Không thể xếp sourcing orchestration" },
    suggestInternal: { loading: "Đang tìm ứng viên phù hợp trong hệ thống...", success: "Đã cập nhật gợi ý ứng viên nội bộ", error: "Không thể gợi ý ứng viên nội bộ" },
    updateProfileStatus: { loading: "Đang cập nhật trạng thái...", success: "Đã cập nhật trạng thái", error: "Không thể cập nhật trạng thái" },
    updateProfileFeedback: { loading: "Đang lưu đánh giá...", success: "Đã lưu đánh giá", error: "Không thể lưu đánh giá" },
  },
} as const satisfies Record<string, Record<string, ActionNotification>>;
