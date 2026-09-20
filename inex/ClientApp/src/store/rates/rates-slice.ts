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
  requestKey: string | null;
  completedKey: string | null;
  error: string | null;
  cached?: CachedRatesState;
}

const ratesSlice = createSlice({
  name: "rates",
  initialState: {
    items: [] as ExchangeRateItem[],
    requestKey: null,
    completedKey: null,
    error: null as string | null,
  } as RatesState,
  reducers: {
    beginRates(state, action) {
      if (state.completedKey !== action.payload.key) {
        state.items = [];
      }
      state.requestKey = action.payload.key;
      state.error = null;
    },
    setRates(state, action) {
      if (state.requestKey !== action.payload.key) return;
      state.items = action.payload.items;
      state.completedKey = action.payload.key;
      state.error = null;
    },
    setError(state, action) {
      if (state.requestKey !== action.payload.key) return;
      state.error = action.payload.error;
    },
    beginCachedRates(state, action) {
      const previous = state.cached;
      state.cached = {
        items: previous && previous.completedKey === action.payload.key ? previous.items : [],
        requestKey: action.payload.key,
        completedKey: previous?.completedKey ?? null,
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
