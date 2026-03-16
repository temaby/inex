import { ItemDetails } from "../Base/ItemDetails";

export class ReportCategoryDetails extends ItemDetails {
  parentId?: number;
  value: number = 0;
  children: ReportCategoryDetails[] = [];
}

export const getCategoryReport = (categories: any, reportData: any) => {
  if (reportData.length === 0 || categories.length === 0) {
    return [];
  }

  const categoryItems = categories.map((item: any) =>
    Object.assign(new ReportCategoryDetails(), {
      ...item,
      children: [],
    })
  );

  const reportItems = reportData.map((item: any) =>
    Object.assign(new ReportCategoryDetails(), {
      ...item,
      children: null,
    })
  );

  const report: ReportCategoryDetails[] = categoryItems.filter(
    (item: any) => (item.parentId === null || item.parentId === undefined) && item.isSystem === false
  );

  report.forEach((reportRaw: ReportCategoryDetails) => {
    reportRaw.children = reportItems.filter((item: ReportCategoryDetails) => item.parentId === reportRaw.id);
    reportRaw.value = reportRaw.children.reduce((tmpValue, i) => tmpValue + i.value, 0);
  });

  return report;
};
