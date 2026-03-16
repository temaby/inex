import { createSlice } from "@reduxjs/toolkit";

const defaultFilter = {
    accountIds: [],
    categoryIds: [],
    tags: [],
    refs: [],
    tagsAndRefs: "",
    range: []
};

const transactionsSlice = createSlice({
    name: "transactions",
    initialState: {
        items: [],
        total: 0,
        isLoading: false,
        isCreating: false,
        isDeleting: false,
        isUpdating: false,
        summaryItems: [],
        lastUpdate: Date(),
        filter: defaultFilter,
        error: null,
    },
    reducers: {
        setTransactions(state, action) {
            state.items = action.payload.items;
        },
        setTotal(state, action) {
            state.total = action.payload.total;
        },
        setIsLoading(state, action) {
            state.isLoading = action.payload.isLoading;
        },
        setIsCreating(state, action) {
            state.isCreating = action.payload.isCreating;
        },
        setIsDeleting(state, action) {
            state.isDeleting = action.payload.isDeleting;
        },
        setIsUpdating(state, action) {
            state.isUpdating = action.payload.isUpdating;
        },
        setLastUpdate(state) {
            state.lastUpdate = Date();
        },
        setTransactionsSummaryForAccounts(state, action) {
            state.summaryItems = action.payload.items;
        },
        setFilter(state, action) {
            state.filter = action.payload.filter;
        },
        resetFilter(state) {
            state.filter = defaultFilter;
        },
        setError(state, action) {
            state.error = action.payload.error;
        },
    },
});

export const transactionsDefaultFilter = defaultFilter;

export const transactionsActions = transactionsSlice.actions;

export default transactionsSlice;
