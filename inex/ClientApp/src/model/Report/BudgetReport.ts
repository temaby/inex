export interface BudgetComparisonDTO {
    categoryName: string;
    categoryIds: number[];
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
}

export interface ReportMetadataDTO {
    name: string;
    currency: string;
    start: string;
    end: string;
}

export interface BudgetReportResponse {
    data: BudgetComparisonDTO[];
    metadata: ReportMetadataDTO;
}
