import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import en from "../../../public/locales/en/translation.json";
import ru from "../../../public/locales/ru/translation.json";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { CategoriesHero } from "./CategoriesHero";
import { CategoriesToolbar } from "./CategoriesToolbar";
import { CategoryRow } from "./CategoryRow";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: translations,
        t: (key: string, options?: { count?: number; date?: string }) => translations.t(key, options),
    }),
}));

const translations = createInstance();
await translations.init({
    lng: "ru",
    resources: { en: { translation: en }, ru: { translation: ru } },
    interpolation: { escapeValue: false },
});

const category = (overrides: Partial<CategoryResponse> = {}): CategoryResponse => ({
    id: 1,
    key: "groceries",
    name: "Groceries",
    description: "",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
    ...overrides,
});

describe("Categories financial overview", () => {
    it.each([
        ["ru", "USD", "1\u00a0234\u00a0567,13", "1\u00a0234\u00a0567,12", "0,01", "<0,1\u00a0%", "100\u00a0% от итога"],
        ["en", "USD", "1,234,567.13", "1,234,567.12", "0.01", "<0.1%", "100% of total"],
        ["en", "JPY", "1,234,567", "1,234,567", "0", "<0.1%", "100% of total"],
        ["ru", "KWD", "1\u00a0234\u00a0567,133", "1\u00a0234\u00a0567,123", "0,010", "<0,1\u00a0%", "100\u00a0% от итога"],
    ])("formats %s amounts in %s at the currency's precision", async (
        locale, currency, totalAmount, largeAmount, smallAmount, smallShare, topShare,
    ) => {
        await translations.changeLanguage(locale);
        try {
            const main = category({ name: "Household expenses and other recurring purchases" });
            const tiny = category({ id: 2, name: "Fees" });
            const mainSpend = 1_234_567.123;
            const totalSpend = mainSpend + 0.01;
            const { container } = render(
                <CategoriesHero
                    categories={[main, tiny]}
                    periodLabel="April 2026"
                    stats={{
                        available: true,
                        byCategoryId: new Map(),
                        currency,
                        distribution: [
                            { key: "1", label: main.name, value: mainSpend, share: mainSpend / totalSpend },
                            { key: "2", label: tiny.name, value: 0.01, share: 0.01 / totalSpend },
                        ],
                        period: { year: 2026, month: 4 },
                        totalSpend,
                        topParent: main,
                        topParentSpend: mainSpend,
                    }}
                />,
            );
            const displayedAmounts = Array.from(container.querySelectorAll('[role="text"] > span'), (element) => element.textContent);
            expect(displayedAmounts).toEqual(
                [totalAmount, largeAmount, largeAmount, smallAmount].map((amount) => `${amount} ${currency}`),
            );
            expect(screen.getByText(main.name, { selector: ".categories-hero__legend-label" })).toBeVisible();
            expect(screen.getByText(topShare, { normalizer: (text) => text })).toBeVisible();
            expect(screen.getByText(smallShare, { normalizer: (text) => text })).toBeVisible();
            const chartSegments = screen.getAllByRole("img");
            expect(chartSegments[1]).toHaveAttribute("aria-label", `${tiny.name} ${smallShare}`);
        } finally {
            await translations.changeLanguage("ru");
        }
    });
});

const renderRow = (overrides: Partial<ComponentProps<typeof CategoryRow>> = {}) => {
    return render(
        <CategoryRow
            category={category()}
            depth={0}
            hasChildren={false}
            isCollapsed={false}
            paletteColor="#0f766e"
            statsAvailable
            currency="USD"
            onEdit={vi.fn()}
            onBranchToggle={vi.fn()}
            {...overrides}
        />,
    );
};

describe("Categories toolbar", () => {
    it("renders labeled status and view controls with search in the same filter surface", () => {
        render(
            <CategoriesToolbar
                total={4}
                visible={2}
                activeOnly
                view="tree"
                search=""
                refreshing={false}
                onActiveOnlyChange={vi.fn()}
                onViewChange={vi.fn()}
                onSearchChange={vi.fn()}
            />,
        );

        expect(screen.getByText(translations.t("categories.controlLabels.status"))).toBeInTheDocument();
        expect(screen.queryByText(translations.t("categories.controlLabels.view"))).not.toBeInTheDocument();
        expect(screen.getByRole("group", { name: translations.t("categories.controlLabels.view") })).toBeInTheDocument();
        expect(screen.getByRole("searchbox", { name: translations.t("categories.search.label") })).toHaveAttribute(
            "placeholder",
            translations.t("categories.search.placeholder"),
        );
        expect(screen.queryByText(translations.t("common.add"))).not.toBeInTheDocument();
    });
});

describe("Category row", () => {
    it("suppresses duplicate descriptions that match the category name", () => {
        renderRow({
            category: category({
                name: "Groceries",
                description: "Groceries",
            }),
        });

        expect(screen.getAllByText("Groceries")).toHaveLength(1);
    });

    it("treats root leaf rows as leaf rows instead of parent rows", () => {
        const { container } = renderRow({
            category: category({ parentId: null }),
            depth: 0,
            hasChildren: false,
        });

        expect(container.querySelector(".category-row")).toHaveClass("category-row--leaf");
        expect(container.querySelector(".category-row")).not.toHaveClass("category-row--parent");
    });

    it.each([[1, "1 операция"], [2, "2 операции"], [5, "5 операций"], [11, "11 операций"], [21, "21 операция"]])(
        "localizes the Russian operation count %i",
        (transactionCount, label) => {
            renderRow({ stats: { categoryId: 1, transactionCount, totalSpend: 42.5, lastActiveDate: null } });
            expect(screen.getByText(label, { selector: "strong" })).toBeVisible();
        },
    );

    it.each([
        ["ru", "USD", 0, true, 42.5, "42,50 USD"],
        ["ru", "USD", 1, true, 1_355.51, "1\u00a0355,51 USD"],
        ["ru", "USD", 2, false, 0.1 + 0.2, "0,30 USD"],
        ["ru", "USD", 2, false, 0, "0,00 USD"],
        ["ru", "USD", 2, false, -0, "0,00 USD"],
        ["ru", "USD", 2, false, -0.004, "0,00 USD"],
        ["ru", "USD", 2, false, -0.005, "-0,01 USD"],
        ["en", "USD", 0, false, 1_355.51, "1,355.51 USD"],
        ["en", "JPY", 0, false, 1_355.51, "1,356 JPY"],
        ["en", "JPY", 0, false, -0.4, "0 JPY"],
        ["ru", "KWD", 2, false, -1_234_567.1234, "-1\u00a0234\u00a0567,123 KWD"],
    ])("formats %s %s amounts at depth %i (parent %s), value %s", async (
        locale, currency, depth, hasChildren, totalSpend, expected,
    ) => {
        await translations.changeLanguage(locale);
        try {
            const { container } = renderRow({
                currency, depth, hasChildren,
                stats: { categoryId: 1, transactionCount: 1, totalSpend, lastActiveDate: null },
            });
            expect(container.querySelector(".category-row__spent")?.textContent).toBe(expected);
        } finally {
            await translations.changeLanguage("ru");
        }
    });

    it("shows the full current-year month and retains the full date in the accessible description", () => {
        const year = new Date().getFullYear();
        renderRow({
            stats: {
                categoryId: 1,
                transactionCount: 3,
                totalSpend: 42.5,
                lastActiveDate: `${year}-11-21T12:00:00`,
            },
            statsAvailable: true,
        });

        const row = screen.getByRole("button", { name: translations.t("categories.drawer.edit", { category: "Groceries" }) });
        expect(row).toHaveTextContent("3 операции");
        expect(row).toHaveTextContent("42,50 USD");
        expect(screen.getByText("21 ноября", { selector: "time" })).toHaveAttribute(
            "title", `Последняя операция: 21 ноября ${year} г.`,
        );
        expect(row).toHaveAccessibleDescription(`3 операции. Последняя операция: 21 ноября ${year} г.`);
        expect(row.querySelector(".category-row__spent small")).not.toBeInTheDocument();
        expect(screen.queryByLabelText(translations.t("categories.operations.unavailable"))).not.toBeInTheDocument();
    });

    it.each([
        ["ru", "2025-09-22", "22 сентября 2025 г."],
        ["ru", "2025-12-31", "31 декабря 2025 г."],
        ["ru", "2026-01-01", "1 января"],
        ["en", "2026-01-01", "January 1"],
        ["en", "2025-12-31", "December 31, 2025"],
    ])("formats %s calendar date %s across the year boundary", async (locale, lastActiveDate, expected) => {
        await translations.changeLanguage(locale);
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 0, 1, 12));
        try {
            renderRow({
                stats: { categoryId: 1, transactionCount: 1, totalSpend: 42.5, lastActiveDate },
            });
            expect(screen.getByText(expected, { selector: "time" })).toHaveAttribute("dateTime", lastActiveDate);
        } finally {
            vi.useRealTimers();
            await translations.changeLanguage("ru");
        }
    });

    it("shows a secondary dash when the operation count is known and the date is missing", () => {
        const { container } = renderRow({
            stats: { categoryId: 1, transactionCount: 1, totalSpend: 42.5, lastActiveDate: null },
        });
        expect(screen.getByText("1 операция", { selector: "strong" })).toBeVisible();
        expect(container.querySelector(".category-row__operation-date")).toHaveTextContent("—");
        expect(container.querySelector("time")).not.toBeInTheDocument();
    });

    it("shows the existing placeholder and no date for categories without expenses", () => {
        const { container } = renderRow({
            stats: { categoryId: 1, transactionCount: 0, totalSpend: 0, lastActiveDate: null },
        });
        expect(screen.getByLabelText("Нет расходных операций")).toHaveTextContent("—");
        expect(container.querySelector("time")).not.toBeInTheDocument();
    });

    it("separates branch collapse from row editing", async () => {
        const user = userEvent.setup();
        const onEdit = vi.fn();
        const onBranchToggle = vi.fn();
        renderRow({ hasChildren: true, onEdit, onBranchToggle });

        const branchToggle = screen.getByRole("button", { name: translations.t("categories.branch.collapse", { category: "Groceries" }) });
        expect(branchToggle).toHaveAttribute("aria-expanded", "true");

        await user.click(branchToggle);
        expect(onBranchToggle).toHaveBeenCalledOnce();
        expect(onEdit).not.toHaveBeenCalled();

        const row = screen.getByRole("button", { name: translations.t("categories.drawer.edit", { category: "Groceries" }) });
        await user.click(row);
        await user.keyboard(" ");
        expect(onEdit).toHaveBeenCalledTimes(2);
    });

    it("uses the shared right/down disclosure semantics", () => {
        const { rerender } = renderRow({ hasChildren: true, isCollapsed: true });

        expect(document.querySelector("[data-hierarchy-disclosure='collapsed']")).toBeInTheDocument();

        rerender(
            <CategoryRow
                category={category()}
                depth={0}
                hasChildren={true}
                isCollapsed={false}
                paletteColor="#0f766e"
                statsAvailable
                currency="USD"
                onEdit={vi.fn()}
                onBranchToggle={vi.fn()}
            />,
        );

        expect(document.querySelector("[data-hierarchy-disclosure='expanded']")).toBeInTheDocument();
    });
});
