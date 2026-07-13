import { createContext } from "react";
import type { Language, TranslationKey } from "@/app/i18n";

export type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

// Keep the context in a small, stable module so edits to translations do not
// create a second context instance during Vite Fast Refresh.
export const LanguageContext = createContext<LanguageContextValue | null>(null);
