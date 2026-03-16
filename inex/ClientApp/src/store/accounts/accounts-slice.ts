import { createSlice } from "@reduxjs/toolkit";

const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    items: []
  },
  reducers: {
    setAccounts(state, action) {
      state.items = action.payload.items;
    }    
  },
});

export const accountsActions = accountsSlice.actions;

export default accountsSlice;