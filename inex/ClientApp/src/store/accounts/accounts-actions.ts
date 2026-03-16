import { accountsActions } from "./accounts-slice";

export const fetchAccounts = (mode: string) => {
  return async (dispatch: any) => {
    try {
      const response = await fetch(`api/accounts?mode=${mode}`);

      if (!response.ok) {
        throw new Error("Could not fetch accounts");
      }
      const responseJSON = await response.json();

      dispatch(
        accountsActions.setAccounts({
          items: responseJSON.data || [],
        })
      );
    } catch (error) {
      // todo process error
    }
  };
};
