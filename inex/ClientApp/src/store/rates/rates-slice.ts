import { createSlice } from "@reduxjs/toolkit";

const ratesSlice = createSlice({
  name: "rates",
  initialState: {
    items: [],
    error: null as string | null,
  },
  reducers: {
    setRates(state, action) {
      state.items = action.payload.items;
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const ratesActions = ratesSlice.actions;

export default ratesSlice;
