import { createSlice } from "@reduxjs/toolkit";

const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    items: [],
    error: null as string | null,
  },
  reducers: {
    setAccounts(state, action) {
      state.items = action.payload.items;
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const accountsActions = accountsSlice.actions;

export default accountsSlice;