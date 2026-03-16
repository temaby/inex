import { createSlice } from "@reduxjs/toolkit";

const ratesSlice = createSlice({
  name: "rates",
  initialState: {
    items: [],
  },
  reducers: {
    setRates(state, action) {
      state.items = action.payload.items;
    },
  },
});

export const ratesActions = ratesSlice.actions;

export default ratesSlice;
