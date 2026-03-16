import { budgetReportActions } from "./budgetReport-slice";

export const fetchBudgetReport = (year: number, month: number, currency: string = "USD") => {
    return async (dispatch: any) => {
        try {
            dispatch(budgetReportActions.setIsLoading(true));
            dispatch(budgetReportActions.setPeriod({ year, month }));

            const response = await fetch(`api/reports/budget/comparison?year=${year}&month=${month}&currency=${currency}`);

            if (!response.ok) {
                throw new Error("Failed to fetch budget report");
            }

            const data = await response.json();
            dispatch(budgetReportActions.setReportData({
                items: data.data,
                metadata: data.metadata
            }));
        } catch (error: any) {
            dispatch(budgetReportActions.setError(error.message));
        } finally {
            dispatch(budgetReportActions.setIsLoading(false));
        }
    };
};
