import { BookOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import SystemChatInbox from "@/app/components/SystemChatInbox";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function CandidateChats() {
  const [searchParams] = useSearchParams();

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Hộp thư ứng viên</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Bot trả lời trước; bấm “Tham gia & ngắt bot” để tự trao đổi, “Rời & bật bot” để giao lại cho bot.</p>
        </div>
        <Link to="/admin/chats/knowledge" className="inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold hover:border-primary hover:text-primary sm:self-auto">
          <BookOpen size={14} aria-hidden="true" /> Kho kiến thức bot
        </Link>
      </div>

      <SystemChatInbox initialApplicationId={searchParams.get("candidate") ?? searchParams.get("application")} />
    </AdminLayout>
  );
}
