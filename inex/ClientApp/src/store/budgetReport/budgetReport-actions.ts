import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { budgetReportActions } from "./budgetReport-slice";

export const fetchBudgetReport = (year: number, month: number, currency: string = "USD") => {
    return async (dispatch: any) => {
        try {
            dispatch(budgetReportActions.setIsLoading(true));
            dispatch(budgetReportActions.setPeriod({ year, month }));

            const { data } = await apiClient.get(
                `/reports/budget/comparison?year=${year}&month=${month}&currency=${currency}`
            );

            dispatch(budgetReportActions.setReportData({
                items: data.data,
                metadata: data.metadata,
            }));
        } catch (error: any) {
            dispatch(budgetReportActions.setError(parseAxiosError(error, "Failed to fetch budget report")));
        } finally {
            dispatch(budgetReportActions.setIsLoading(false));
        }
    };
};
