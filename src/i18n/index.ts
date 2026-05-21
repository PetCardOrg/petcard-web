import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBR from "./locales/pt-BR/common.json";
import enUS from "./locales/en-US/common.json";

export const supportedLanguages = [
  { code: "pt-BR", label: "Português" },
  { code: "en-US", label: "English" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": { translation: ptBR },
      "en-US": { translation: enUS },
    },
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en-US"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "petcard-language",
      caches: ["localStorage"],
    },
  });

export default i18n;
