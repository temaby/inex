export type DashboardCategoryMode = "parent" | "child";
export type DashboardFlow = "income" | "expense";

export interface DashboardCategorySource {
  id: number;
  name?: string;
  parentId?: number | null;
  isSystem?: boolean;
  value?: number;
}

export interface DashboardCategorySlice {
  key: string;
  id: number | null;
  label: string;
  amount: number;
  categoryIds: number[];
  isOther: boolean;
  parentId: number | null;
  members?: DashboardCategorySlice[];
}

const includesFlow = (value: number, flow: DashboardFlow) => (
  flow === "income" ? value > 0 : value < 0
);

const findRoot = (
  category: DashboardCategorySource,
  categoriesById: Map<number, DashboardCategorySource>,
) => {
  let current = category;
  const visited = new Set<number>();

  while (current.parentId != null && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = categoriesById.get(current.parentId);
    if (!parent || parent.isSystem) break;
    current = parent;
  }

  return current;
};

const hasSystemAncestor = (
  category: DashboardCategorySource,
  categoriesById: Map<number, DashboardCategorySource>,
) => {
  let current: DashboardCategorySource | undefined = category;
  const visited = new Set<number>();

  while (current && !visited.has(current.id)) {
    if (current.isSystem) return true;
    visited.add(current.id);
    current = current.parentId == null ? undefined : categoriesById.get(current.parentId);
  }

  return false;
};

const findBranchBelowParent = (
  category: DashboardCategorySource,
  parentId: number,
  categoriesById: Map<number, DashboardCategorySource>,
) => {
  if (category.id === parentId) return category;

  let current = category;
  const visited = new Set<number>();
  while (current.parentId != null && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentId === parentId) return current;
    const parent = categoriesById.get(current.parentId);
    if (!parent) return null;
    current = parent;
  }

  return null;
};

const buildSlice = (
  category: DashboardCategorySource,
  amount: number,
  categoryIds: number[],
  label: string,
): DashboardCategorySlice => ({
  key: String(category.id),
  id: category.id,
  label,
  amount,
  categoryIds,
  isOther: false,
  parentId: category.parentId ?? null,
});

export const rankDashboardCategorySlices = (
  slices: DashboardCategorySlice[],
  otherLabel: string,
  limit = 8,
): DashboardCategorySlice[] => {
  const sorted = slices
    .filter((slice) => slice.amount > 0)
    .sort((left, right) => right.amount - left.amount || left.label.localeCompare(right.label));

  if (sorted.length <= limit) return sorted;

  const visible = sorted.slice(0, limit);
  const remaining = sorted.slice(limit);
  return [
    ...visible,
    {
      key: "other",
      id: null,
      label: otherLabel,
      amount: remaining.reduce((sum, slice) => sum + slice.amount, 0),
      categoryIds: remaining.flatMap((slice) => slice.categoryIds),
      isOther: true,
      parentId: null,
      members: remaining,
    },
  ];
};

export const buildDashboardCategorySlices = ({
  categories,
  reportData,
  flow,
  mode,
  selectedParentId,
  otherLabel,
}: {
  categories: DashboardCategorySource[];
  reportData: DashboardCategorySource[];
  flow: DashboardFlow;
  mode: DashboardCategoryMode;
  selectedParentId?: number | null;
  otherLabel: string;
}): DashboardCategorySlice[] => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const sourceRows = reportData
    .map((row) => ({ ...categoriesById.get(row.id), ...row }))
    .filter((row) => !hasSystemAncestor(row, categoriesById) && includesFlow(row.value ?? 0, flow));

  if (selectedParentId != null) {
    const parent = categoriesById.get(selectedParentId);
    if (!parent) return [];

    const branches = new Map<number, DashboardCategorySlice>();
    sourceRows.forEach((row) => {
      const branch = findBranchBelowParent(row, parent.id, categoriesById);
      if (!branch) return;
      const current = branches.get(branch.id);
      if (current) {
        current.amount += Math.abs(row.value ?? 0);
        current.categoryIds.push(row.id);
      } else {
        branches.set(branch.id, buildSlice(
          branch,
          Math.abs(row.value ?? 0),
          [row.id],
          branch.name ?? String(branch.id),
        ));
      }
    });

    return rankDashboardCategorySlices([...branches.values()], otherLabel);
  }

  if (mode === "child") {
    const childSlices = new Map<number, DashboardCategorySlice>();
    sourceRows.forEach((row) => {
      const parentCategory = row.parentId == null ? null : categoriesById.get(row.parentId);
      const label = parentCategory
        ? `${parentCategory.name ?? ""} / ${row.name ?? ""}`
        : row.name ?? String(row.id);
      const current = childSlices.get(row.id);
      if (current) {
        current.amount += Math.abs(row.value ?? 0);
      } else {
        childSlices.set(row.id, buildSlice(row, Math.abs(row.value ?? 0), [row.id], label));
      }
    });

    return rankDashboardCategorySlices([...childSlices.values()], otherLabel);
  }

  const parentSlices = new Map<number, DashboardCategorySlice>();
  sourceRows.forEach((row) => {
    const root = findRoot(row, categoriesById);
    const current = parentSlices.get(root.id);
    const amount = Math.abs(row.value ?? 0);
    if (current) {
      current.amount += amount;
      current.categoryIds.push(row.id);
      return;
    }

    parentSlices.set(root.id, buildSlice(root, amount, [row.id], root.name ?? String(root.id)));
  });

  return rankDashboardCategorySlices([...parentSlices.values()], otherLabel);
};

export const buildDashboardTransactionFilter = ({
  accountIds,
  categoryIds,
  flow,
  startDate,
  endDate,
}: {
  accountIds: number[];
  categoryIds: number[];
  flow: DashboardFlow;
  startDate: string;
  endDate: string;
}) => `accountIds:${accountIds.join(",")};categoryIds:${categoryIds.join(",")};start:${startDate};end:${endDate};type:${flow};`;
