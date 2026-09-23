import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const fallbackLng =
  typeof window === "undefined"
    ? "ru"
    : localStorage.getItem("i18nextLng") || "ru";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "ru", "kk"],
    nonExplicitSupportedLngs: true,
    fallbackLng,
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      // cache busting (dev): ?v=timestamp
      queryStringParams: { v: new Date().getTime() },
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    returnNull: false,
  })
  .then(() => {
    console.log("i18n initialized with language:", i18n.language);
  });

export default i18n;
