import { ItemDetails } from "../Base/ItemDetails";

export interface BudgetDetails extends ItemDetails {
    value: number;
    categoryIds: number[];
    year: number;
    month: number;
}

export const createBudgetDetails = (data?: Partial<BudgetDetails>): BudgetDetails => ({
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

export const defaultBudget: BudgetDetails = createBudgetDetails({
    id: -1,
    key: "Выберите бюджет",
    name: "Выберите бюджет",
    description: "Выберите бюджет",
});
