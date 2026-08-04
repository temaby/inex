import { createSlice } from "@reduxjs/toolkit";

export interface ExchangeRateItem {
  id: number;
  currencyFrom: string;
  currencyTo: string;
  date: string;
  rate: number;
  isTemporary: boolean;
}

interface CachedRatesState {
  items: ExchangeRateItem[];
  requestKey: string | null;
  completedKey: string | null;
  loading: boolean;
  error: string | null;
}

interface RatesState {
  items: ExchangeRateItem[];
  error: string | null;
  cached?: CachedRatesState;
}

const ratesSlice = createSlice({
  name: "rates",
  initialState: {
    items: [] as ExchangeRateItem[],
    error: null as string | null,
  } as RatesState,
  reducers: {
    setRates(state, action) {
      state.items = action.payload.items;
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    beginCachedRates(state, action) {
      state.cached = {
        items: state.cached?.items ?? [],
        requestKey: action.payload.key,
        completedKey: state.cached?.completedKey ?? null,
        loading: true,
        error: null,
      };
    },
    setCachedRates(state, action) {
      const cached = state.cached;
      if (!cached || cached.requestKey !== action.payload.key) return;

      cached.items = action.payload.items;
      cached.completedKey = action.payload.key;
      cached.loading = false;
      cached.error = null;
    },
    setCachedRatesError(state, action) {
      const cached = state.cached;
      if (!cached || cached.requestKey !== action.payload.key) return;

      cached.completedKey = action.payload.key;
      cached.loading = false;
      cached.error = action.payload.error;
    },
  },
});

export const ratesActions = ratesSlice.actions;

export default ratesSlice;
