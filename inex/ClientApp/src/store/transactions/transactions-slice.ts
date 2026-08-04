import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type TransactionFilterType = "all" | "income" | "expense" | "transfer";

export interface TransactionFilter {
    accountIds: number[];
    categoryIds: number[];
    tags: string[];
    refs: string[];
    range: number[];
    type?: TransactionFilterType;
    search?: string;
}

export interface NormalizedTransactionFilter extends TransactionFilter {
    type: TransactionFilterType;
    search: string;
}

interface TransactionsState {
    filter: NormalizedTransactionFilter;
    error: string | null;
}

const defaultFilter: NormalizedTransactionFilter = {
    accountIds: [],
    categoryIds: [],
    tags: [],
    refs: [],
    range: [],
    type: "all",
    search: "",
};

const normalizedIds = (values: number[] | undefined): number[] => Array.from(
    new Set((values ?? []).filter((value) => Number.isInteger(value) && value > 0)),
).sort((left, right) => left - right);

const normalizedText = (values: string[] | undefined): string[] => Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
).sort((left, right) => left.localeCompare(right));

export const normalizeTransactionFilter = (filter: Partial<TransactionFilter>): NormalizedTransactionFilter => {
    const type = filter.type === "income" || filter.type === "expense" || filter.type === "transfer"
        ? filter.type
        : "all";
    const range = filter.range?.length === 2 && filter.range[0] > 0 && filter.range[1] >= filter.range[0]
        ? [filter.range[0], filter.range[1]]
        : [];

    return {
        accountIds: normalizedIds(filter.accountIds),
        categoryIds: normalizedIds(filter.categoryIds),
        tags: normalizedText(filter.tags),
        refs: normalizedText(filter.refs),
        range,
        type,
        search: filter.search?.trim() ?? "",
    };
};

const transactionsSlice = createSlice({
    name: "transactions",
    initialState: {
        filter: defaultFilter,
        error: null as string | null,
    } as TransactionsState,
    reducers: {
        setFilter(state, action: PayloadAction<{ filter: Partial<TransactionFilter> }>) {
            state.filter = normalizeTransactionFilter({ ...defaultFilter, ...action.payload.filter });
        },
        resetFilter(state) {
            state.filter = defaultFilter;
        },
        setError(state, action: PayloadAction<{ error: string | null }>) {
            state.error = action.payload.error;
        },
    },
});

export const transactionsDefaultFilter = defaultFilter;

export const transactionsActions = transactionsSlice.actions;

export default transactionsSlice;
