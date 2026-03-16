import { createSlice } from "@reduxjs/toolkit";

const categoriesSlice = createSlice({
    name: "categories",
    initialState: {
        items: [],
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        lastUpdate: Date(),
        error: null,
    },
    reducers: {
        setCategories(state, action) {
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
            state.lastUpdate = Date();
        },
        setError(state, action) {
            state.error = action.payload.error;
        },
    },
});

export const categoriesActions = categoriesSlice.actions;

export default categoriesSlice;
