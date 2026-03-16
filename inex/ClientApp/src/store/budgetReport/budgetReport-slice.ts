import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BudgetComparisonDTO, ReportMetadataDTO } from "../../model/Report/BudgetReport";

interface BudgetReportState {
    items: BudgetComparisonDTO[];
    metadata: ReportMetadataDTO | null;
    isLoading: boolean;
    error: string | null;
    selectedYear: number;
    selectedMonth: number;
}

const initialState: BudgetReportState = {
    items: [],
    metadata: null,
    isLoading: false,
    error: null,
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
};

const budgetReportSlice = createSlice({
    name: "budgetReport",
    initialState,
    reducers: {
        setReportData(state, action: PayloadAction<{ items: BudgetComparisonDTO[], metadata: ReportMetadataDTO }>) {
            state.items = action.payload.items;
            state.metadata = action.payload.metadata;
            state.error = null;
        },
        setIsLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        setError(state, action: PayloadAction<string>) {
            state.error = action.payload;
        },
        setPeriod(state, action: PayloadAction<{ year: number; month: number }>) {
            state.selectedYear = action.payload.year;
            state.selectedMonth = action.payload.month;
        },
    },
});

export const budgetReportActions = budgetReportSlice.actions;
export default budgetReportSlice;
