import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { ratesActions } from "./rates-slice";
import type { AppDispatch } from "../index";

export const fetchRatesForDate = (date: Date) => {
  return async (dispatch: AppDispatch) => {
    try {
      const { data } = await apiClient.get(`/exchange/rates/${date.toISOString().slice(0, 10)}`);
      dispatch(ratesActions.setRates({ items: data.data || [] }));
    } catch (error) {
      dispatch(ratesActions.setError(parseAxiosError(error, "Could not fetch exchange rates")));
    }
  };
};

export const fetchCachedRatesForRange = (startDate: string, endDate: string) => {
  return async (dispatch: AppDispatch) => {
    const key = `${startDate}:${endDate}`;
    dispatch(ratesActions.beginCachedRates({ key }));

    try {
      const { data } = await apiClient.get("/exchange/rates/cached", {
        params: { startDate, endDate },
      });
      dispatch(ratesActions.setCachedRates({ key, items: data.data || [] }));
    } catch (error) {
      dispatch(ratesActions.setCachedRatesError({
        key,
        error: parseAxiosError(error, "Could not fetch cached exchange rates"),
      }));
    }
  };
};
