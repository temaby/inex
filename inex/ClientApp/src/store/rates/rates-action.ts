import { ratesActions } from "./rates-slice";

export const fetchRatesForDate = (date: Date) => {
  return async (dispatch: any) => {
    try {
      const response = await fetch(`api/exchange/rates/${date.toISOString().slice(0, 10)}`);

      if (!response.ok) {
        throw new Error("Could not fetch transactions summary");
      }
      
      const responseJSON = await response.json();

      dispatch(
        ratesActions.setRates({
          items: responseJSON.data || [],
        })
      );      
    } catch (error) {
      // todo process error
    }
  };
};
