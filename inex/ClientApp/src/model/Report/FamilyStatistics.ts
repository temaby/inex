export interface FamilyTotals {
  balance: number | null;
  income: number | null;
  expenses: number | null;
  surplus: number | null;
  balanceComplete: boolean;
  cashFlowComplete: boolean;
}

export interface FamilyCategory {
  userId: number;
  username: string;
  categoryId: number;
  path: string;
  amount: number;
}

export interface FamilyStatistics {
  year: number;
  month: number;
  currency: string;
  balanceDate: string;
  totals: FamilyTotals;
  participants: Array<{ userId: number; username: string; isMaster: boolean; totals: FamilyTotals }>;
  incomeCategories: FamilyCategory[] | null;
  expenseCategories: FamilyCategory[] | null;
  missingRates: Array<{ scope: "balance" | "cashFlow"; currency: string; date: string }>;
}
