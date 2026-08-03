import { ImageWithFallback } from "@/app/components/ImageFallBack";

const logoImg = "/images/bich-candy-logo.jpg";

const particles = [
  { left: "15%", top: "25%", delay: "0ms" },
  { left: "80%", top: "15%", delay: "320ms" },
  { left: "60%", top: "70%", delay: "620ms" },
  { left: "30%", top: "75%", delay: "180ms" },
  { left: "90%", top: "55%", delay: "520ms" },
  { left: "10%", top: "60%", delay: "820ms" },
  { left: "50%", top: "10%", delay: "260ms" },
  { left: "72%", top: "88%", delay: "980ms" },
];

export default function AppIntro() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--background)_0%,var(--secondary)_45%,var(--muted)_100%)]" />
      <div className="absolute -left-20 -top-20 size-80 rounded-full bg-[radial-gradient(circle,var(--accent)_0%,transparent_70%)] opacity-40 animate-[intro-blob_6s_ease-in-out_infinite]" />
      <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--primary)_0%,transparent_70%)] opacity-20 animate-[intro-blob_7.5s_ease-in-out_infinite_300ms]" />
      <div className="absolute -right-32 top-1/2 size-64 rounded-full bg-[radial-gradient(circle,var(--muted)_0%,transparent_70%)] opacity-55 animate-[intro-blob_6.8s_ease-in-out_infinite_160ms]" />

      {particles.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className="absolute size-1.5 rounded-full bg-accent/70 animate-[intro-particle_2.5s_ease-out_infinite]"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative animate-[intro-logo-pop_600ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <div className="size-28 overflow-hidden rounded-full border-[3px] border-accent shadow-[0_20px_60px_rgba(200,91,122,0.27)]">
            <ImageWithFallback
              src={logoImg}
              alt="Lường Bích"
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="absolute -inset-2.5 rounded-full border-2 border-accent/60 animate-[intro-orbit_8s_linear_infinite]">
            <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          </div>
        </div>

        <div className="animate-[intro-fade-up_700ms_ease-out_320ms_both] text-center">
          <h1 className="text-4xl font-extrabold leading-tight text-foreground md:text-5xl">
            Lường Bích
          </h1>
          <p className="mt-1 text-base font-semibold uppercase text-primary tracking-[0.2em]">
            Tư Vấn Tuyển Dụng
          </p>
        </div>

        <p className="max-w-xs animate-[intro-fade-up_700ms_ease-out_520ms_both] text-center text-sm leading-relaxed text-muted-foreground">
          Nơi kết nối những ước mơ với cơ hội, hàng trăm việc làm chất lượng đang chờ bạn
        </p>

        <div className="flex animate-[intro-fade-up_500ms_ease-out_740ms_both] flex-col items-center gap-3">
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
            <div className="h-full origin-left animate-[intro-progress_1.35s_ease-out_forwards] rounded-full bg-[linear-gradient(90deg,var(--primary)_0%,var(--accent)_100%)]" />
          </div>
          <p className="text-xs font-medium text-primary">Đang tải...</p>
        </div>

        <div className="mt-2 flex animate-[intro-fade-up_500ms_ease-out_900ms_both] gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1.5 rounded-full bg-primary animate-[intro-dot_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${dot * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
