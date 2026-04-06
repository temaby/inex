import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { accountsActions } from "./accounts-slice";

const API_BASE = "/accounts";

export const fetchAccounts = (mode: string) => {
  return async (dispatch: any) => {
    try {
      dispatch(accountsActions.setIsLoading({ isLoading: true }));
      const { data } = await apiClient.get(`${API_BASE}?mode=${mode}`);
      dispatch(accountsActions.setAccounts({ items: data.data || [] }));
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not fetch accounts")));
    } finally {
      dispatch(accountsActions.setIsLoading({ isLoading: false }));
    }
  };
};

export const createAccount = (key: string, name: string, description: string, currencyId: number, isEnabled: boolean) => {
  return async (dispatch: any) => {
    try {
      dispatch(accountsActions.setIsCreating({ isCreating: true }));
      await apiClient.post(API_BASE, { key, name, description, currencyId, isEnabled });
      dispatch(accountsActions.setLastUpdate());
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not create account")));
    } finally {
      dispatch(accountsActions.setIsCreating({ isCreating: false }));
    }
  };
};

export const updateAccount = (id: number, name: string, description: string, currencyId: number, isEnabled: boolean) => {
  return async (dispatch: any) => {
    try {
      dispatch(accountsActions.setIsUpdating({ isUpdating: true }));
      await apiClient.put(`${API_BASE}/${id}`, { id, name, description, currencyId, isEnabled });
      dispatch(accountsActions.setLastUpdate());
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not update account")));
    } finally {
      dispatch(accountsActions.setIsUpdating({ isUpdating: false }));
    }
  };
};

export const deleteAccount = (id: number) => {
  return async (dispatch: any) => {
    try {
      await apiClient.delete(`${API_BASE}/${id}`);
      dispatch(accountsActions.setLastUpdate());
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not delete account")));
    }
  };
};
