import { parseApiError } from "../../utils/parseApiError";
import { accountsActions } from "./accounts-slice";

export const fetchAccounts = (mode: string) => {
  return async (dispatch: any) => {
    try {
      const response = await fetch(`api/accounts?mode=${mode}`);

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not fetch accounts"));
      }
      const responseJSON = await response.json();

      dispatch(
        accountsActions.setAccounts({
          items: responseJSON.data || [],
        })
      );
    } catch (error) {
      dispatch(accountsActions.setError((error as Error).message));
    }
  };
};
