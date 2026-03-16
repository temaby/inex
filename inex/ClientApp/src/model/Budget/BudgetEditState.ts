export interface BudgetEditState {
    id: number;
    key: string;
    name: string;
    description: string;
    value: number;
    categoryIds: number[];
    year: number;
    month: number;
}

export const createBudgetEditState = (data?: Partial<BudgetEditState>): BudgetEditState => ({
    id: 0,
    key: "",
    name: "",
    description: "",
    value: 0,
    categoryIds: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    ...data,
});
