import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import ru from "../../../public/locales/ru/translation.json";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { CategoriesToolbar } from "./CategoriesToolbar";
import { CategoryRow } from "./CategoryRow";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: { language: "ru" },
        t: (key: string, options?: { count?: number; date?: string }) => translations.t(key, options),
    }),
}));

const translations = createInstance();
await translations.init({ lng: "ru", resources: { ru: { translation: ru } } });

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

    it.each([[1, "1 операция"], [2, "2 операции"], [5, "5 операций"], [13, "13 операций"], [21, "21 операция"]])(
        "localizes the Russian operation count %i",
        (transactionCount, label) => {
            renderRow({ stats: { categoryId: 1, transactionCount, totalSpend: 42.5, lastActiveDate: null } });
            expect(screen.getByText(label, { selector: "strong" })).toBeVisible();
        },
    );

    it("shows the expense amount and concise date, with the full date on hover", () => {
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
        expect(row).toHaveTextContent("42.50 USD");
        expect(screen.getByText("21 нояб.", { selector: "time" })).toHaveAttribute(
            "title", `Последняя операция: 21 ноября ${year} г.`,
        );
        expect(row).toHaveAccessibleDescription(`3 операции. Последняя операция: 21 ноября ${year} г.`);
        expect(row.querySelector(".category-row__spent small")).not.toBeInTheDocument();
        expect(screen.queryByLabelText(translations.t("categories.operations.unavailable"))).not.toBeInTheDocument();
    });

    it("includes the year when the last-operation date is from an earlier year", () => {
        const year = new Date().getFullYear() - 1;
        renderRow({
            stats: { categoryId: 1, transactionCount: 1, totalSpend: 42.5, lastActiveDate: `${year}-11-21T12:00:00` },
        });
        expect(screen.getByText(`21 нояб. ${year} г.`, { selector: "time" })).toBeInTheDocument();
    });

    it("shows the existing placeholder and no date for categories without expenses", () => {
        const { container } = renderRow();
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
