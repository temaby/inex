import { createSlice } from "@reduxjs/toolkit";

interface ExchangeRateItem {
  id: number;
  currencyFrom: string;
  currencyTo: string;
  date: string;
  rate: number;
  isTemporary: boolean;
}

const ratesSlice = createSlice({
  name: "rates",
  initialState: {
    items: [] as ExchangeRateItem[],
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
