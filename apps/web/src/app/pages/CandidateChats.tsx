import { useSearchParams } from "react-router";
import CandidateChatPanel from "@/app/components/CandidateChatPanel";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function CandidateChats() {
  const [searchParams] = useSearchParams();

  return (
    <AdminLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Chat ứng viên</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Quản lý trao đổi theo từng ứng viên và kênh liên hệ.</p>
      </div>

      <CandidateChatPanel initialCandidateId={searchParams.get("candidate")} />
    </AdminLayout>
  );
}
