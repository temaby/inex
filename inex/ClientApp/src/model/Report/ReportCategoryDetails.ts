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
}

const toReportItem = (item: CategoryReportSource): ReportCategoryDetails =>
  Object.assign(new ReportCategoryDetails(), {
    ...item,
    parentId: item.parentId ?? undefined,
    value: item.value ?? 0,
    children: [],
  });

export const getCategoryReport = (categories: CategoryReportSource[], reportData: CategoryReportSource[]) => {
  if (reportData.length === 0 || categories.length === 0) {
    return [];
  }

  const categoryItems = categories.map(toReportItem);
  const reportItems = reportData.map(toReportItem);
  const report: ReportCategoryDetails[] = categoryItems.filter(
    (item) => (item.parentId === null || item.parentId === undefined) && item.isSystem === false
  );

  report.forEach((reportRaw: ReportCategoryDetails) => {
    reportRaw.children = reportItems.filter((item: ReportCategoryDetails) => item.parentId === reportRaw.id);
    reportRaw.value = reportRaw.children.reduce((tmpValue, i) => tmpValue + i.value, 0);
  });

  return report;
};
