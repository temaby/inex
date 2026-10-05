import { describe, expect, it } from "vitest";

import {
  buildDashboardCategorySlices,
  buildDashboardTransactionFilter,
} from "./dashboard-utils";

const categories = [
  { id: 1, name: "Food", parentId: null, isSystem: false },
  { id: 2, name: "Groceries", parentId: 1, isSystem: false },
  { id: 3, name: "Dining", parentId: 1, isSystem: false },
  { id: 4, name: "Salary", parentId: null, isSystem: false },
  { id: 99, name: "Transfer", parentId: null, isSystem: true },
];

const reportData = [
  { id: 2, name: "Groceries", parentId: 1, value: -500 },
  { id: 3, name: "Dining", parentId: 1, value: -150 },
  { id: 4, name: "Salary", parentId: null, value: 2400 },
  { id: 99, name: "Transfer", parentId: null, isSystem: true, value: -100 },
];

describe("Dashboard category helpers", () => {
  it("aggregates expense children into their parent", () => {
    expect(buildDashboardCategorySlices({
      categories,
      reportData,
      flow: "expense",
      mode: "parent",
      otherLabel: "Other",
    })).toEqual([expect.objectContaining({ id: 1, label: "Food", amount: 650, categoryIds: [2, 3] })]);
  });

  it("drills into one parent and separates income from expenses", () => {
    const children = buildDashboardCategorySlices({
      categories,
      reportData,
      flow: "expense",
      mode: "parent",
      selectedParentId: 1,
      otherLabel: "Other",
    });
    expect(children.map((item) => item.label)).toEqual(["Groceries", "Dining"]);

    expect(buildDashboardCategorySlices({
      categories,
      reportData,
      flow: "income",
      mode: "parent",
      otherLabel: "Other",
    })).toEqual([expect.objectContaining({ id: 4, label: "Salary", amount: 2400 })]);
  });

  it("keeps gross income and expense rows separate when a category has both flows", () => {
    const mixed = [
      { id: 2, name: "Groceries", parentId: 1, value: -90 },
      { id: 2, name: "Groceries", parentId: 1, value: 100 },
    ];

    expect(buildDashboardCategorySlices({
      categories,
      reportData: mixed,
      flow: "expense",
      mode: "parent",
      otherLabel: "Other",
    })[0]).toMatchObject({ label: "Food", amount: 90 });
    expect(buildDashboardCategorySlices({
      categories,
      reportData: mixed,
      flow: "income",
      mode: "parent",
      otherLabel: "Other",
    })[0]).toMatchObject({ label: "Food", amount: 100 });
  });

  it("groups direct and deep descendant activity inside the selected parent", () => {
    const nestedCategories = [
      ...categories,
      { id: 5, name: "Fresh food", parentId: 2, isSystem: false },
    ];
    const nestedReport = [
      { id: 1, name: "Food", parentId: null, value: -10 },
      { id: 5, name: "Fresh food", parentId: 2, value: -40 },
    ];

    expect(buildDashboardCategorySlices({
      categories: nestedCategories,
      reportData: nestedReport,
      flow: "expense",
      mode: "parent",
      selectedParentId: 1,
      otherLabel: "Other",
    })).toEqual([
      expect.objectContaining({ id: 2, label: "Groceries", amount: 40, categoryIds: [5] }),
      expect.objectContaining({ id: 1, label: "Food", amount: 10, categoryIds: [1] }),
    ]);
  });

  it("excludes activity anywhere below a system category", () => {
    const systemChild = { id: 100, name: "Transfer fee", parentId: 99, isSystem: false };
    expect(buildDashboardCategorySlices({
      categories: [...categories, systemChild],
      reportData: [{ ...systemChild, value: -20 }],
      flow: "expense",
      mode: "parent",
      otherLabel: "Other",
    })).toEqual([]);
  });

  it("adds parent context in child mode and groups overflow into Other", () => {
    const denseReport = Array.from({ length: 10 }, (_, index) => ({
      id: index + 10,
      name: `Child ${index + 1}`,
      parentId: 1,
      value: -(100 - index),
    }));
    const denseCategories = [...categories, ...denseReport.map(({ value, ...category }) => ({ ...category, isSystem: false }))];

    const slices = buildDashboardCategorySlices({
      categories: denseCategories,
      reportData: denseReport,
      flow: "expense",
      mode: "child",
      otherLabel: "Other",
    });

    expect(slices).toHaveLength(9);
    expect(slices[0].label).toBe("Food / Child 1");
    expect(slices[8]).toMatchObject({ isOther: true, label: "Other", categoryIds: [18, 19] });
  });

  it("builds a current-period transaction filter", () => {
    expect(buildDashboardTransactionFilter({
      accountIds: [3, 7],
      categoryIds: [2, 5],
      flow: "expense",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    })).toBe("accountIds:3,7;categoryIds:2,5;start:2026-09-01;end:2026-09-30;type:expense;");
  });
});
