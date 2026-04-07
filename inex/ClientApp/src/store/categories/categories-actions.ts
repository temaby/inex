import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { categoriesActions } from "./categories-slice";
import type { AppDispatch } from "../index";

const API_BASE = "/categories";

export const fetchCategories = (mode: string) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(categoriesActions.setIsLoading({ isLoading: true }));

            const { data } = await apiClient.get(`${API_BASE}?mode=${mode}`);
            dispatch(categoriesActions.setCategories({ items: data.data || [] }));
        } catch (error) {
            dispatch(categoriesActions.setError({ error: parseAxiosError(error, "Could not fetch categories") }));
        } finally {
            dispatch(categoriesActions.setIsLoading({ isLoading: false }));
        }
    };
};

export const createCategory = (key: string, name: string, description: string, isEnabled: boolean) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(categoriesActions.setIsCreating({ isCreating: true }));

            await apiClient.post(API_BASE, { key, name, description, isEnabled });
            dispatch(categoriesActions.setLastUpdate());
        } catch (error) {
            dispatch(categoriesActions.setError({ error: parseAxiosError(error, "Could not create a category") }));
        } finally {
            dispatch(categoriesActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const updateCategory = (id: number, name: string, description: string, isEnabled: boolean) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(categoriesActions.setIsUpdating({ isUpdating: true }));

            await apiClient.put(`${API_BASE}/${id}`, { id, name, description, isEnabled });
            dispatch(categoriesActions.setLastUpdate());
        } catch (error) {
            dispatch(categoriesActions.setError({ error: parseAxiosError(error, "Could not update a category") }));
        } finally {
            dispatch(categoriesActions.setIsUpdating({ isUpdating: false }));
        }
    };
};

export const deleteCategory = (id: number) => {
    return async (dispatch: AppDispatch) => {
        try {
            await apiClient.delete(`${API_BASE}/${id}`);
            dispatch(categoriesActions.setLastUpdate());
        } catch (error) {
            dispatch(categoriesActions.setError({ error: parseAxiosError(error, "Could not delete category") }));
        }
    };
};
