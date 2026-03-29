import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { accountsActions } from "./accounts-slice";

export const fetchAccounts = (mode: string) => {
  return async (dispatch: any) => {
    try {
      const { data } = await apiClient.get(`/accounts?mode=${mode}`);
      dispatch(accountsActions.setAccounts({ items: data.data || [] }));
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not fetch accounts")));
    }
  };
};
