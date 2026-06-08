import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { CategoriesToolbar } from "./CategoriesToolbar";
import { CategoryRow } from "./CategoryRow";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

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
    const budget = overrides.budget as BudgetDetails | undefined;

    return render(
        <CategoryRow
            category={category()}
            depth={0}
            hasChildren={false}
            expanded={false}
            paletteColor="#0f766e"
            periodLabel="June 2026"
            statsAvailable
            budget={budget}
            currency="USD"
            onToggle={vi.fn()}
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

        expect(screen.getByText("categories.controlLabels.status")).toBeInTheDocument();
        expect(screen.getByText("categories.controlLabels.view")).toBeInTheDocument();
        expect(screen.getByRole("searchbox", { name: "categories.search.label" })).toHaveAttribute(
            "placeholder",
            "categories.search.placeholder",
        );
        expect(screen.queryByText("common.add")).not.toBeInTheDocument();
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
        const { getByRole } = renderRow({
            category: category({ parentId: null }),
            depth: 0,
            hasChildren: false,
        });

        expect(getByRole("button")).toHaveClass("category-row--leaf");
        expect(getByRole("button")).not.toHaveClass("category-row--parent");
    });
});
