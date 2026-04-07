import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { budgetsActions } from "./budgets-slice";
import type { AppDispatch } from "../index";

const API_BASE = "/budgets";

export const fetchBudgets = (year?: number, month?: number) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(budgetsActions.setIsLoading({ isLoading: true }));

            const params = new URLSearchParams();
            if (year !== undefined) params.append("year", year.toString());
            if (month !== undefined) params.append("month", month.toString());
            const query = params.toString() ? `?${params.toString()}` : "";

            const { data } = await apiClient.get(`${API_BASE}${query}`);

            const budgetItems = Array.isArray(data.data)
                ? data.data
                : data.data
                ? [data.data]
                : [];

            dispatch(budgetsActions.setBudgets({ items: budgetItems }));
        } catch (error) {
            dispatch(budgetsActions.setError({ error: parseAxiosError(error, "Could not fetch budgets") }));
        } finally {
            dispatch(budgetsActions.setIsLoading({ isLoading: false }));
        }
    };
};

export const copyBudgets = (
    sourceYear: number,
    sourceMonth: number,
    targetYear: number,
    targetMonth: number
) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(budgetsActions.setIsCreating({ isCreating: true }));

            const params = new URLSearchParams({
                sourceYear: sourceYear.toString(),
                sourceMonth: sourceMonth.toString(),
                targetYear: targetYear.toString(),
                targetMonth: targetMonth.toString(),
            });

            await apiClient.post(`${API_BASE}/copy?${params.toString()}`);
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: parseAxiosError(error, "Could not copy budgets") }));
            throw error;
        } finally {
            dispatch(budgetsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const createBudget = (
    key: string,
    name: string,
    description: string,
    value: number,
    categoryIds: number[],
    year: number,
    month: number
) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(budgetsActions.setIsCreating({ isCreating: true }));

            await apiClient.post(API_BASE, { key, name, description, value, categoryIds, year, month });
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: parseAxiosError(error, "Could not create a budget") }));
            throw error;
        } finally {
            dispatch(budgetsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const updateBudget = (
    id: number,
    key: string,
    name: string,
    description: string,
    value: number,
    categoryIds: number[],
    year: number,
    month: number
) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(budgetsActions.setIsUpdating({ isUpdating: true }));

            await apiClient.put(`${API_BASE}/${id}`, { id, key, name, description, value, categoryIds, year, month });
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: parseAxiosError(error, "Could not update a budget") }));
            throw error;
        } finally {
            dispatch(budgetsActions.setIsUpdating({ isUpdating: false }));
        }
    };
};

export const deleteBudget = (id: number) => {
    return async (dispatch: AppDispatch) => {
        try {
            await apiClient.delete(`${API_BASE}/${id}`);
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: parseAxiosError(error, "Could not delete a budget") }));
            throw error;
        }
    };
};
