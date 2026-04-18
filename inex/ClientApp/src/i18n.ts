import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import dayjs from "dayjs";

function syncDayjsLocale(lang: string) {
    dayjs.locale(lang === "ru" ? "ru" : "en");
}

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: localStorage.getItem("i18n_lang") || "en",
        fallbackLng: "en",
        supportedLngs: ["en", "ru"],
        backend: {
            loadPath: "/locales/{{lng}}/translation.json",
        },
        interpolation: {
            escapeValue: false,
        },
    });

i18n.on("languageChanged", syncDayjsLocale);
syncDayjsLocale(i18n.language);

export default i18n;
