import { createSlice } from "@reduxjs/toolkit";

const budgetsSlice = createSlice({
    name: "budgets",
    initialState: {
        items: [],
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        lastUpdate: Date.now(),
        error: null,
    },
    reducers: {
        setBudgets(state, action) {
            state.items = action.payload.items;
        },
        setIsLoading(state, action) {
            state.isLoading = action.payload.isLoading;
        },
        setIsCreating(state, action) {
            state.isCreating = action.payload.isCreating;
        },
        setIsUpdating(state, action) {
            state.isUpdating = action.payload.isUpdating;
        },
        setLastUpdate(state) {
            state.lastUpdate = Date.now();
        },
        setError(state, action) {
            state.error = action.payload.error;
        },
    },
});

export const budgetsActions = budgetsSlice.actions;

export default budgetsSlice;
