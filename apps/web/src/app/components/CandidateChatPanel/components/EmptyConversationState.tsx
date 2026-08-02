import { MessageCircle } from "lucide-react";

export function EmptyConversationState() {
  return (
    <div className="bg-white border border-border rounded-2xl p-8 text-center text-muted-foreground">
      <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
      <p className="font-bold text-foreground">Chưa có ứng viên để chat</p>
      <p className="text-sm mt-1">Khi có hồ sơ mới, hội thoại sẽ xuất hiện tại đây.</p>
    </div>
  );
}

