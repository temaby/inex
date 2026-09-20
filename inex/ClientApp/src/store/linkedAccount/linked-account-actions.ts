import apiClient from "../../utils/apiClient";
import type { AppDispatch, RootState } from "../index";
import {
  linkedAccountActions,
  type LinkedAccountLinkState,
} from "./linked-account-slice";

export const fetchLinkedAccountContext = (userId: number) => async (
  dispatch: AppDispatch,
  getState: () => RootState,
) => {
  dispatch(linkedAccountActions.beginLoading(userId));

  try {
    const { data } = await apiClient.get<LinkedAccountLinkState>("/auth/link-state");
    if (getState().auth.user?.id !== userId) return;
    dispatch(linkedAccountActions.setLinkState({ userId, linkState: data }));
  } catch {
    if (getState().auth.user?.id !== userId) return;
    dispatch(linkedAccountActions.setLoadFailed(userId));
  }
};
