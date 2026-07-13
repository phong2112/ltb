import { toast, type ExternalToast } from "sonner";

export type ActionNotification = {
  loading: string;
  success: string;
  error?: string;
};
type NotificationId = string | number;

const DEFAULT_DURATION = 3500;

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export const notificationService = {
  loading(message: string) {
    return toast.loading(message, { duration: Number.POSITIVE_INFINITY });
  },

  success(message: string, id?: NotificationId) {
    return toast.success(message, { id, duration: DEFAULT_DURATION });
  },

  error(error: unknown, fallback = "Không thể thực hiện thao tác", id?: NotificationId) {
    return toast.error(messageFromError(error, fallback), { id, duration: 5000 });
  },

  info(message: string, options?: ExternalToast) {
    return toast.info(message, { duration: DEFAULT_DURATION, ...options });
  },

  dismiss(id?: NotificationId) {
    toast.dismiss(id);
  },
};
