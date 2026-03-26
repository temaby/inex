import { parseApiError } from "../../utils/parseApiError";
import { ratesActions } from "./rates-slice";

export const fetchRatesForDate = (date: Date) => {
  return async (dispatch: any) => {
    try {
      const response = await fetch(`api/exchange/rates/${date.toISOString().slice(0, 10)}`);

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not fetch exchange rates"));
      }

      const responseJSON = await response.json();

      dispatch(
        ratesActions.setRates({
          items: responseJSON.data || [],
        })
      );
    } catch (error) {
      dispatch(ratesActions.setError((error as Error).message));
    }
  };
};
