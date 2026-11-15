import type { CategoryReportNode } from "../../model/Report/ReportCategoryDetails";

export type CategorySort = "amount" | "name" | "default";
export type CategorySection = "income" | "expense";

const incomeKeys = new Set(["income", "salary", "freelance", "other-income"]);
const incomeGroupNames = new Set(["income", "доход", "доходы"]);

export const getCategoryReportSections = (
    report: CategoryReportNode[], showEmpty: boolean, sort: CategorySort, locale: string,
) => {
    const sections = {
        income: { value: 0, categories: [] as CategoryReportNode[] },
        expense: { value: 0, categories: [] as CategoryReportNode[] },
    };

    for (const category of report) {
        const isIncomeGroup = category.children.length > 0 &&
            (category.key === "income" || incomeGroupNames.has(category.name.trim().toLowerCase()));
        // Categories have no direction field. Use the existing signed rollup, with known income keys for empty rows.
        const section = isIncomeGroup || category.value > 0 || (category.value === 0 && incomeKeys.has(category.key))
            ? sections.income : sections.expense;
        section.value += category.value;

        if (isIncomeGroup) {
            section.categories.push(...category.children);
            if (category.directValue !== 0) {
                section.categories.push({ ...category, value: category.directValue, children: [] });
            }
        } else {
            section.categories.push(category);
        }
    }

    const collator = new Intl.Collator(locale);
    const prepare = (siblings: CategoryReportNode[]): CategoryReportNode[] => {
        const visible = siblings.filter((category) => showEmpty || category.hasActivity);
        if (sort === "amount") visible.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        if (sort === "name") visible.sort((a, b) => collator.compare(a.name, b.name));
        return visible.map((category) => ({ ...category, children: prepare(category.children) }));
    };

    return {
        income: { ...sections.income, categories: prepare(sections.income.categories) },
        expense: { ...sections.expense, categories: prepare(sections.expense.categories) },
    };
};
