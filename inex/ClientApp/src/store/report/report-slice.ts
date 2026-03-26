import { createSlice } from "@reduxjs/toolkit";

const defaultFilter = {
  range: [],
};

const reportSlice = createSlice({
  name: "report",
  initialState: {
    title: "",
    items: [],
    history: [],
    currency: "",
    filter: defaultFilter,
    isLoading: false,
    error: null as string | null,
  },
  reducers: {
    setDetails(state, action) {
      state.title = action.payload.title;
      state.items = action.payload.items;
      state.currency = action.payload.currency;
    },
    setHistory(state, action) {
      state.history = action.payload.history;
    },
    setFilter(state, action) {
      state.filter = action.payload.filter;
    },
    setIsLoading(state, action) {
      state.isLoading = action.payload.isLoading;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const reportDefaultFilter = defaultFilter; 

export const reportActions = reportSlice.actions;

export default reportSlice;
