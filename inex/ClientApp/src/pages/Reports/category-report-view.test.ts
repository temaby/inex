import { getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import type { CategoryReportSource } from "../../model/Report/ReportCategoryDetails";
import { getCategoryReportSections } from "./category-report-view";

const category = (id: number, name: string, parentId: number | null = null): CategoryReportSource =>
    ({ id, name, parentId, isSystem: false, isEnabled: true });

describe("category report presentation", () => {
    it("keeps active descendants and zero-net parents while filtering empty branches", () => {
        const inactiveParent = { ...category(1, "Archived"), isEnabled: false };
        const branch = category(2, "Household", 1);
        const purchase = category(3, "Purchase", 2);
        const refund = category(4, "Refund", 2);
        const reportedZero = category(5, "Reported zero", 2);
        const empty = category(6, "Empty", 2);
        const emptyBranch = category(7, "Empty branch");
        const categories = [inactiveParent, branch, purchase, refund, reportedZero, empty, emptyBranch];
        const data = [{ ...purchase, value: -100 }, { ...refund, value: 100 }, { ...reportedZero, value: 0 }];
        const report = getCategoryReport(categories, data);

        const hidden = getCategoryReportSections(report, false, "amount", "en").expense;
        expect(hidden.value).toBe(0);
        expect(hidden.categories.map(({ id }) => id)).toEqual([1]);
        const [visibleBranch] = hidden.categories[0].children;
        expect(visibleBranch.value).toBe(0);
        expect(visibleBranch.children.map(({ id, value }) => [id, value])).toEqual([[3, -100], [4, 100], [5, 0]]);

        const shown = getCategoryReportSections(report, true, "default", "en").expense;
        expect(shown.categories.map(({ id }) => id)).toEqual([1, 7]);
        expect(shown.categories[0].children[0].children.map(({ id }) => id)).toEqual([3, 4, 5, 6]);
        expect(shown.value).toBe(hidden.value);
    });

    it("sorts against the selected locale and restores source order after sorting", () => {
        const wrapper = category(1, "Доходы");
        const first = category(2, "Épargne", 1);
        const second = category(3, "Zebra", 1);
        const third = category(4, "Acompte", 1);
        const nested = category(5, "Honoraires", 4);
        const report = getCategoryReport([wrapper, first, second, third, nested], [
            { ...first, value: 50 }, { ...second, value: 100 }, { ...third, value: -25 }, { ...nested, value: 75 },
        ]);

        const sorted = getCategoryReportSections(report, false, "name", "fr").income;
        expect(sorted.value).toBe(200);
        expect(sorted.categories.map(({ id }) => id)).toEqual([4, 2, 3]);
        expect(sorted.categories[0].children[0].id).toBe(5);
        expect(getCategoryReportSections(report, false, "amount", "fr").income.categories.map(({ id }) => id))
            .toEqual([3, 2, 4]);
        expect(getCategoryReportSections(report, false, "default", "fr").income.categories.map(({ id }) => id))
            .toEqual([2, 3, 4]);
        expect(report[0].children.map(({ id }) => id)).toEqual([2, 3, 4]);
    });

    it("includes direct transactions on roots and intermediate categories without duplication", () => {
        const income = { ...category(1, "Renamed income group"), key: "income" };
        const salary = category(2, "Salary", 1);
        const expenses = category(3, "Home");
        const bills = category(4, "Bills", 3);
        const repairs = category(5, "Repairs", 4);
        const report = getCategoryReport([income, salary, expenses, bills, repairs], [
            { ...income, value: 100 }, { ...salary, value: 200 }, { ...expenses, value: -80 },
            { ...bills, value: 20 }, { ...repairs, value: -50 },
        ]);

        const sections = getCategoryReportSections(report, false, "amount", "en");
        expect(sections.income.value).toBe(300);
        expect(sections.income.categories.map(({ id, value }) => [id, value])).toEqual([[2, 200], [1, 100]]);
        expect(sections.expense.value).toBe(-110);
        expect(sections.expense.categories[0].children[0].value).toBe(-30);
    });
});
