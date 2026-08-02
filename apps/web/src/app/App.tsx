import { RouterProvider } from "react-router";
import { router } from "@/app/routers";
import { DataProvider } from "@/app/data";
import { LanguageProvider } from "@/app/services/i18n-service";
import { Toaster } from "@/app/components/Common/sonner";

export default function App() {
  return (
    <LanguageProvider>
      <DataProvider>
        <RouterProvider router={router} />
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
