import { createSlice } from "@reduxjs/toolkit";

const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    items: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    lastUpdate: Date(),
    error: null as string | null,
  },
  reducers: {
    setAccounts(state, action) {
      state.items = action.payload.items;
      state.error = null;
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
      state.error = action.payload;
    },
  },
});

export const accountsActions = accountsSlice.actions;

export default accountsSlice;
