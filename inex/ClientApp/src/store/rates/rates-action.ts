import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { ratesActions } from "./rates-slice";
import type { AppDispatch } from "../index";

export const fetchRatesForDate = (date: Date, linkedUserId?: number | null) => {
  return async (dispatch: AppDispatch) => {
    const dateKey = date.toISOString().slice(0, 10);
    const requestKey = `${linkedUserId ?? "self"}:${dateKey}`;
    dispatch(ratesActions.beginRates({ key: requestKey }));

    try {
      const { data } = linkedUserId == null
        ? await apiClient.get(`/exchange/rates/${dateKey}`)
        : await apiClient.get("/exchange/rates/cached", {
            params: { startDate: dateKey, endDate: dateKey, linkedUserId },
          });
      dispatch(ratesActions.setRates({ key: requestKey, items: data.data || [] }));
    } catch (error) {
      dispatch(ratesActions.setError({
        key: requestKey,
        error: parseAxiosError(error, "Could not fetch exchange rates"),
      }));
    }
  };
};

export const fetchCachedRatesForRange = (
  startDate: string,
  endDate: string,
  linkedUserId?: number | null,
) => {
  return async (dispatch: AppDispatch) => {
    const key = `${linkedUserId ?? "self"}:${startDate}:${endDate}`;
    dispatch(ratesActions.beginCachedRates({ key }));

    try {
      const { data } = await apiClient.get("/exchange/rates/cached", {
        params: { startDate, endDate, linkedUserId: linkedUserId ?? undefined },
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
