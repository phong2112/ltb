import viDictionary from "./dictionaries/vi.json";

export type Language = "vi" | "en";
export type Dictionary = typeof viDictionary;
export type TranslationKey = keyof Dictionary["translations"];

