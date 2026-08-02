import { useContext, useEffect, useMemo, useState } from "react";
import enDictionary from "./dictionaries/en.json";
import viDictionary from "./dictionaries/vi.json";
import { LanguageContext, type LanguageContextValue } from "./context";
import type { Dictionary, Language, TranslationKey } from "./types";

export type { Language, TranslationKey };

const STORAGE_KEY = "hr-copilot-language";

const dictionaries = {
  vi: viDictionary,
  en: enDictionary,
} satisfies Record<Language, Dictionary>;

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "vi" ? stored : "vi";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key) => dictionaries[language].translations[key],
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function translateJobType(type: string, language: Language) {
  return translateLabel(dictionaries[language].jobTypes, type);
}

export function translateJobLevel(level: string, language: Language) {
  return translateLabel(dictionaries[language].jobLevels, level);
}

export function translateCandidateStatus(status: string, language: Language) {
  return translateLabel(dictionaries[language].candidateStatuses, status);
}

export function translateJobStatus(status: string, language: Language) {
  return translateLabel(dictionaries[language].jobStatuses, status);
}

function translateLabel(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}
