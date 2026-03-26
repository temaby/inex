import moment from "moment";
import { parseApiError } from "../../utils/parseApiError";
import { reportActions } from "./report-slice";

export const fetchReport = (type: string, filter: any) => {
  return async (dispatch: any) => {
    try {
      dispatch(reportActions.setIsLoading({ isLoading: true }));

      const startStr: string =
        filter.range.length === 2 && filter.range[0] > 0 ? `Start:${moment.unix(filter.range[0]).format("YYYY-MM-DD")};` : "";
      const endStr: string =
        filter.range.length === 2 && filter.range[1] > 0 ? `End:${moment.unix(filter.range[1]).format("YYYY-MM-DD")};` : "";
      const filterStr: string = startStr !== "" || endStr !== "" ? `?filter=${startStr}${endStr}` : "";

      const response = await fetch(`api/reports/${type}${filterStr}`);

      if (!response.ok) {
        throw new Error(await parseApiError(response, `Could not fetch ${type} report`));
      }
      const responseJSON = await response.json();

      dispatch(
        reportActions.setDetails({
          title: responseJSON.metadata.name,
          items: responseJSON.data || [],
          currency: responseJSON.metadata.currency,
        })
      );
    } catch (error) {
      dispatch(reportActions.setError((error as Error).message));
    } finally {
      dispatch(reportActions.setIsLoading({ isLoading: false }));
    }
  };
};

export const fetchHistory = (year: number, currency: string = "USD") => {
  return async (dispatch: any) => {
    try {
      dispatch(reportActions.setIsLoading({ isLoading: true }));

      const response = await fetch(`api/reports/history/${year}?currency=${currency}`);

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not fetch history report"));
      }
      const responseJSON = await response.json();

      dispatch(
        reportActions.setHistory({
          history: responseJSON.data || [],
        })
      );
    } catch (error) {
      dispatch(reportActions.setError((error as Error).message));
    } finally {
      dispatch(reportActions.setIsLoading({ isLoading: false }));
    }
  };
};
