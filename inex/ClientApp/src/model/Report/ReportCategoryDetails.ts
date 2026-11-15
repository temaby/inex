import { ItemDetails } from "../Base/ItemDetails";

export class ReportCategoryDetails extends ItemDetails {
  parentId?: number | null;
  isSystem?: boolean;
  value: number = 0;
  children: ReportCategoryDetails[] = [];
}

export interface CategoryReportSource {
  id: number;
  key?: string;
  isSystem?: boolean;
  name?: string;
  description?: string | null;
  parentId?: number | null;
  value?: number;
  isEnabled?: boolean;
}

export interface CategoryReportNode extends ReportCategoryDetails {
  directValue: number;
  hasActivity: boolean;
  children: CategoryReportNode[];
}

export const getCategoryReport = (categories: CategoryReportSource[], reportData: CategoryReportSource[]) => {
  const reported = new Map(reportData.map((item) => [item.id, item]));
  const childrenByParent = new Map<number | null, CategoryReportSource[]>();

  for (const category of categories) {
    if (category.isSystem) continue;
    const parentId = category.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(parentId, siblings);
  }

  const buildChildren = (parentId: number | null): CategoryReportNode[] => {
    return (childrenByParent.get(parentId) ?? []).flatMap((category) => {
      const reportItem = reported.get(category.id);
      const children = buildChildren(category.id);
      const directValue = reportItem?.value ?? 0;
      // The report omits zero-net rows. A row returned by the API is evidence of activity.
      const hasActivity = reportItem !== undefined || children.some((child) => child.hasActivity);
      if (category.isEnabled === false && !hasActivity) return [];

      return [Object.assign(new ReportCategoryDetails(), category, {
        name: reportItem?.name ?? category.name ?? "",
        directValue,
        hasActivity,
        value: children.reduce((total, child) => total + child.value, directValue),
        children,
      })];
    });
  };

  return buildChildren(null);
};
