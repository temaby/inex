import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { clearAuth } from "../auth/auth-slice";

export interface LinkedAccountSummary {
  id: number;
  username: string;
  email: string | null;
  baseCurrency: string;
}

export interface LinkedAccountLinkState {
  state: "master" | "linked" | "unlinked";
  masterAccount: LinkedAccountSummary | null;
  linkedAccounts: LinkedAccountSummary[];
}

interface LinkedAccountState {
  sessionUserId: number | null;
  linkState: LinkedAccountLinkState | null;
  selectedLinkedUserId: number | null;
  loading: boolean;
  unavailable: boolean;
}

const initialState: LinkedAccountState = {
  sessionUserId: null,
  linkState: null,
  selectedLinkedUserId: null,
  loading: false,
  unavailable: false,
};

const linkedAccountSlice = createSlice({
  name: "linkedAccount",
  initialState,
  reducers: {
    beginLoading(state, action: PayloadAction<number>) {
      if (state.sessionUserId !== action.payload) {
        state.sessionUserId = action.payload;
        state.linkState = null;
        state.selectedLinkedUserId = null;
        state.unavailable = false;
      }
      state.loading = true;
    },
    setLinkState(state, action: PayloadAction<{
      userId: number;
      linkState: LinkedAccountLinkState;
    }>) {
      if (state.sessionUserId !== action.payload.userId) return;

      state.linkState = action.payload.linkState;
      state.loading = false;

      if (
        state.selectedLinkedUserId !== null &&
        !action.payload.linkState.linkedAccounts.some((account) => account.id === state.selectedLinkedUserId)
      ) {
        state.selectedLinkedUserId = null;
        state.unavailable = true;
      }
    },
    setLoadFailed(state, action: PayloadAction<number>) {
      if (state.sessionUserId !== action.payload) return;
      state.loading = false;
    },
    selectLinkedUser(state, action: PayloadAction<number | null>) {
      const requestedId = action.payload;
      state.selectedLinkedUserId = requestedId !== null &&
        state.linkState?.linkedAccounts.some((account) => account.id === requestedId)
        ? requestedId
        : null;
      state.unavailable = false;
    },
    linkedScopeUnavailable(state, action: PayloadAction<number>) {
      const unavailableId = action.payload;
      if (state.selectedLinkedUserId !== unavailableId) return;

      state.selectedLinkedUserId = null;
      state.unavailable = true;

      if (unavailableId !== null && state.linkState) {
        state.linkState.linkedAccounts = state.linkState.linkedAccounts.filter(
          (account) => account.id !== unavailableId,
        );
      }
    },
    dismissUnavailable(state) {
      state.unavailable = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearAuth, () => initialState);
  },
});

export const linkedAccountActions = linkedAccountSlice.actions;
export default linkedAccountSlice;
