import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { DataProvider } from "@/app/data";
import { LanguageProvider } from "@/app/i18n";

export default function App() {
  return (
    <LanguageProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </LanguageProvider>
  );
}
