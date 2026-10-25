import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import en from "../../../public/locales/en/translation.json";
import ru from "../../../public/locales/ru/translation.json";
import { getVisualDashboardFlowTitleKey } from "./visual-dashboard-copy";

describe("Visual dashboard period wording", () => {
    it.each([
        [undefined, "flowTitle"], ["2026-10-01", "flowTitle"],
        ["2026-09-01", "flowTitlePast"], ["2025-10-01", "flowTitlePast"],
        ["2026-11-01", "flowTitleFuture"], ["invalid", "flowTitle"],
    ])("selects wording for %s", (periodStart, suffix) => {
        expect(getVisualDashboardFlowTitleKey(periodStart, new Date(2026, 9, 25)))
            .toBe(`dashboard.visual.${suffix}`);
    });
});

describe("Visual dashboard localized copy", () => {
    it("keeps English and Russian visual keys aligned and avoids personal or wallet wording", () => {
        expect(Object.keys(en.dashboard.visual).sort()).toEqual(Object.keys(ru.dashboard.visual).sort());
        for (const copy of [en.dashboard.visual, ru.dashboard.visual]) {
            expect(Object.values(copy).every((value) => value.trim().length > 0)).toBe(true);
            expect(Object.values(copy).join(" ")).not.toMatch(/\bmy\b|\bour\b|wallet|мои|наши|кошел/iu);
        }
    });

    it.each([
        { language: "en", translation: en, positive: "Income is higher by", negative: "Expenses are higher by",
            equal: "Income and expenses are equal", current: "How the month is going", past: "How the month went" },
        { language: "ru", translation: ru, positive: "Доходов больше на", negative: "Расходов больше на",
            equal: "Доходы и расходы равны", current: "Как идёт месяц", past: "Как прошёл месяц" },
    ])("interpolates results, metadata and period headings in $language", ({ language, translation, positive, negative, equal, current, past }) => {
        const i18n = createInstance();
        void i18n.init({ lng: language, fallbackLng: false, initAsync: false,
            resources: { [language]: { translation } } });
        const amount = new Intl.NumberFormat(language, { style: "currency", currency: "USD" }).format(123.45);
        expect(i18n.t("dashboard.visual.resultPositive", { amount })).toBe(`${positive} ${amount}`);
        expect(i18n.t("dashboard.visual.resultNegative", { amount })).toBe(`${negative} ${amount}`);
        expect(i18n.t("dashboard.visual.resultEqual")).toBe(equal);
        expect(i18n.t(getVisualDashboardFlowTitleKey("2026-10-01", new Date(2026, 9, 25)))).toBe(current);
        expect(i18n.t(getVisualDashboardFlowTitleKey("2026-09-01", new Date(2026, 9, 25)))).toBe(past);
        expect(i18n.t("dashboard.visual.totalBalance", { currency: "USD" })).toContain("USD");
        expect(i18n.t("dashboard.visual.ratesMissing", { currencies: "EUR (2026-10-01)" })).toContain("EUR (2026-10-01)");
        for (const count of [1, 2, 5]) {
            const metadata = i18n.t("dashboard.balance.metadata", { count, date: "2026-10-25" });
            expect(metadata).toContain(String(count));
            expect(metadata).toContain("2026-10-25");
            expect(metadata).not.toMatch(/{{|dashboard\./);
        }
    });
});
