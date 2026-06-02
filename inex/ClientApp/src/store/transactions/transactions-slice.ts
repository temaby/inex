import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { TransactionFilterState } from "../../model/Transaction/TransactionFilterState";

export interface TransactionFilter {
    accountIds: number[];
    categoryIds: number[];
    tags: string[];
    refs: string[];
    range: number[];
}

interface TransactionsState {
    filter: TransactionFilterState;
    error: string | null;
}

const defaultFilter: TransactionFilterState = {
    accountIds: [],
    categoryIds: [],
    tags: [],
    refs: [],
    tagsAndRefs: "",
    range: [],
};

const transactionsSlice = createSlice({
    name: "transactions",
    initialState: {
        filter: defaultFilter,
        error: null as string | null,
    } as TransactionsState,
    reducers: {
        setFilter(state, action: PayloadAction<{ filter: TransactionFilterState | TransactionFilter }>) {
            state.filter = { ...defaultFilter, ...action.payload.filter };
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
