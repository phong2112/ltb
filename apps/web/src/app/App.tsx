import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "@/app/routers";
import { DataProvider } from "@/app/data";
import { LanguageProvider } from "@/app/services/i18n-service";
import { Toaster } from "@/app/components/Common/sonner";
import AnalyticsErrorBoundary from "@/app/components/AnalyticsErrorBoundary";
import { installAnalyticsLifecycle } from "@/app/services/analytics";
import AppIntro from "@/app/components/AppIntro";

const INTRO_DURATION_MS = 1350;
const REDUCED_MOTION_INTRO_DURATION_MS = 500;

export default function App() {
  useEffect(() => installAnalyticsLifecycle(), []);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (!showIntro) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        setShowIntro(false);
      },
      prefersReducedMotion ? REDUCED_MOTION_INTRO_DURATION_MS : INTRO_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [showIntro]);

  return (
    <LanguageProvider>
      {showIntro && <AppIntro />}
      <DataProvider>
        <AnalyticsErrorBoundary><RouterProvider router={router} /></AnalyticsErrorBoundary>
      </DataProvider>
      <Toaster
        position="top-right"
        duration={3500}
        visibleToasts={4}
        closeButton
        richColors
        offset={20}
        mobileOffset={12}
        toastOptions={{
          classNames: {
            toast: "rounded-xl border-border bg-white shadow-lg",
            title: "text-sm font-bold",
            description: "text-xs text-muted-foreground",
            closeButton: "border-border bg-white text-muted-foreground",
          },
        }}
      />
    </LanguageProvider>
  );
}
