import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 360);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      className={`fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-primary/75 text-white shadow-[0_12px_28px_rgba(214,85,124,0.28)] backdrop-blur transition-all duration-200 hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:hidden ${
        visible ? "translate-y-0 opacity-80" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
