import moment from "moment";
import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { reportActions } from "./report-slice";
import type { AppDispatch } from "../index";

export const fetchReport = (type: string, filter: any) => {
  return async (dispatch: AppDispatch) => {
    try {
      dispatch(reportActions.setIsLoading({ isLoading: true }));

      const startStr: string =
        filter.range.length === 2 && filter.range[0] > 0
          ? `Start:${moment.unix(filter.range[0]).format("YYYY-MM-DD")};`
          : "";
      const endStr: string =
        filter.range.length === 2 && filter.range[1] > 0
          ? `End:${moment.unix(filter.range[1]).format("YYYY-MM-DD")};`
          : "";
      const filterStr: string =
        startStr !== "" || endStr !== "" ? `?filter=${startStr}${endStr}` : "";

      const { data } = await apiClient.get(`/reports/${type}${filterStr}`);

      dispatch(
        reportActions.setDetails({
          title: data.metadata.name,
          items: data.data || [],
          currency: data.metadata.currency,
        })
      );
    } catch (error) {
      dispatch(reportActions.setError(parseAxiosError(error, `Could not fetch ${type} report`)));
    } finally {
      dispatch(reportActions.setIsLoading({ isLoading: false }));
    }
  };
};

export const fetchHistory = (year: number, currency: string = "USD") => {
  return async (dispatch: AppDispatch) => {
    try {
      dispatch(reportActions.setIsLoading({ isLoading: true }));

      const { data } = await apiClient.get(`/reports/history/${year}?currency=${currency}`);

      dispatch(reportActions.setHistory({ history: data.data || [] }));
    } catch (error) {
      dispatch(reportActions.setError(parseAxiosError(error, "Could not fetch history report")));
    } finally {
      dispatch(reportActions.setIsLoading({ isLoading: false }));
    }
  };
};
