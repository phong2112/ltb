import { BriefcaseBusiness, Sparkles } from "lucide-react";
import { ImageWithFallback } from "@/app/components/ImageFallBack";

const portraitImg = "/images/luong-thi-bich.png";

export default function AppIntro() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-hidden bg-[#fff7fa] px-5 text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff7fa_0%,#fde8ef_42%,#f9d6e2_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-white/55" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/70 to-transparent" />

      <div className="relative grid w-full max-w-5xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-3 py-1.5 text-xs font-black text-primary shadow-sm">
            <Sparkles size={13} />
            TA Copilot
          </div>

          <h1
            className="max-w-2xl text-[2.45rem] font-black leading-[1.05] text-foreground min-[420px]:text-5xl md:text-6xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Lường Bích
          </h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-muted-foreground sm:text-base">
            Kết nối ứng viên với cơ hội phù hợp, gọn gàng hơn cho ứng tuyển và rõ ràng hơn cho tuyển dụng.
          </p>

          <div className="mt-7 max-w-md overflow-hidden rounded-full border border-pink-200 bg-white/75 p-1 shadow-sm">
            <div className="h-2.5 origin-left animate-[intro-progress_1.35s_ease-out_forwards] rounded-full bg-primary" />
          </div>

          <div className="mt-5 flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-pink-200 bg-white text-primary shadow-sm">
              <BriefcaseBusiness size={17} />
            </span>
            Đang chuẩn bị không gian tuyển dụng...
          </div>
        </div>

        <div className="hidden justify-end md:flex">
          <div className="relative h-80 w-80 overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_70px_rgba(200,91,122,0.22)]">
            <ImageWithFallback
              src={portraitImg}
              alt="Lường Bích"
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2d1b22]/70 to-transparent p-5 pt-16 text-white">
              <p className="text-xs font-bold uppercase">Career site</p>
              <p className="mt-1 text-lg font-black" style={{ fontFamily: "'Playfair Display', serif" }}>
                Thoughtful hiring
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
