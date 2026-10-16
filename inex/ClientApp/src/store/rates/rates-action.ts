import { nanoid } from "@reduxjs/toolkit";
import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { ratesActions } from "./rates-slice";
import type { AppDispatch, RootState } from "../index";

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

// Keep on-demand results separate from cache-only consumers and deduplicate pending page effects.
export const fetchRatesForRange = (
  startDate: string,
  endDate: string,
  linkedUserId?: number | null,
) => {
  return async (dispatch: AppDispatch, getState: () => Pick<RootState, "rates">) => {
    const key = `${linkedUserId ?? "self"}:${startDate}:${endDate}`;
    const pending = getState().rates.range;
    if (pending?.requestKey === key && pending.loading) return;
    const requestId = nanoid();
    dispatch(ratesActions.beginRangeRates({ key, requestId }));

    const params = { startDate, endDate, linkedUserId: linkedUserId ?? undefined };
    try {
      let data;
      if (linkedUserId != null) {
        ({ data } = await apiClient.get("/exchange/rates/cached", { params }));
      } else {
        try {
          ({ data } = await apiClient.get("/exchange/rates/range", { params }));
        } catch {
          // Synchronization can fail after writing useful rates; retain whatever is cached.
          ({ data } = await apiClient.get("/exchange/rates/cached", { params }));
        }
      }
      dispatch(ratesActions.setRangeRates({ key, requestId, items: data.data || [] }));
    } catch (error) {
      dispatch(ratesActions.setRangeRatesError({
        key,
        requestId,
        error: parseAxiosError(error, "Could not fetch exchange rates"),
      }));
    }
  };
};
