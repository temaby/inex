export interface BudgetComparisonItem {
    categoryName: string;
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
}

export interface BudgetComparisonReport {
    year: number;
    month: number;
    currency: string;
    items: BudgetComparisonItem[];
}
