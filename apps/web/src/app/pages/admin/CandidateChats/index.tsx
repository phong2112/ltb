import { useSearchParams } from "react-router";
import SystemChatInbox from "@/app/components/SystemChatInbox";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function CandidateChats() {
  const [searchParams] = useSearchParams();

  return (
    <AdminLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Hộp thư ứng viên</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Trao đổi trực tiếp với khách truy cập trên career site.</p>
      </div>

      <SystemChatInbox initialApplicationId={searchParams.get("candidate") ?? searchParams.get("application")} />
    </AdminLayout>
  );
}
