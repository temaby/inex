import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { AccountSummary } from "../../model/Account/AccountSummary";
import { TransactionFilterState } from "../../model/Transaction/TransactionFilterState";
import { TransactionResponse } from "../../model/Transaction/TransactionResponse";

export interface TransactionFilter {
    accountIds: number[];
    categoryIds: number[];
    tags: string[];
    refs: string[];
    range: number[];
}

interface TransactionsState {
    items: TransactionResponse[];
    total: number;
    isLoading: boolean;
    isCreating: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    summaryItems: AccountSummary[];
    lastUpdate: string;
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
        items: [] as TransactionResponse[],
        total: 0,
        isLoading: false,
        isCreating: false,
        isDeleting: false,
        isUpdating: false,
        summaryItems: [] as AccountSummary[],
        lastUpdate: Date(),
        filter: defaultFilter,
        error: null as string | null,
    } as TransactionsState,
    reducers: {
        setTransactions(state, action: PayloadAction<{ items: TransactionResponse[] }>) {
            state.items = action.payload.items;
        },
        setTotal(state, action: PayloadAction<{ total: number }>) {
            state.total = action.payload.total;
        },
        setIsLoading(state, action: PayloadAction<{ isLoading: boolean }>) {
            state.isLoading = action.payload.isLoading;
        },
        setIsCreating(state, action: PayloadAction<{ isCreating: boolean }>) {
            state.isCreating = action.payload.isCreating;
        },
        setIsDeleting(state, action: PayloadAction<{ isDeleting: boolean }>) {
            state.isDeleting = action.payload.isDeleting;
        },
        setIsUpdating(state, action: PayloadAction<{ isUpdating: boolean }>) {
            state.isUpdating = action.payload.isUpdating;
        },
        setLastUpdate(state) {
            state.lastUpdate = Date();
        },
        setTransactionsSummaryForAccounts(state, action: PayloadAction<{ items: AccountSummary[] }>) {
            state.summaryItems = action.payload.items;
        },
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
