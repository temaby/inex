import { parseApiError } from "../../utils/parseApiError";
import { categoriesActions } from "./categories-slice";

const API_BASE = "api/categories";

export const fetchCategories = (mode: string) => {
    return async (dispatch: any) => {
        try {
            dispatch(categoriesActions.setIsLoading({ isLoading: true }));
            const response = await fetch(`${API_BASE}?mode=${mode}`);

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Could not fetch categories"));
            }
            const responseJSON = await response.json();

            dispatch(categoriesActions.setCategories({ items: responseJSON.data || [] }));            
        } catch (error) {
            dispatch(categoriesActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(categoriesActions.setIsLoading({ isLoading: false }));
        }
    };
};

export const createCategory = (name: string, description: string, isEnabled: boolean) => {
    return async (dispatch: any) => {
        try {
            dispatch(categoriesActions.setIsCreating({ isCreating: true }));

            const newCategory = { name, description, isEnabled };

            const response: Response = await fetch(API_BASE, {
                method: "POST",
                body: JSON.stringify(newCategory),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Could not create a category"));
            }

            const responseJSON = await response.json();
            console.log(responseJSON);

            dispatch(categoriesActions.setLastUpdate());
        } catch (error) {
            dispatch(categoriesActions.setError({ error: (error as Error).message }));
            console.error(error);
        } finally {
            dispatch(categoriesActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const updateCategory = (id: number, name: string, description: string, isEnabled: boolean) => {
    return async (dispatch: any) => {
        try {
            dispatch(categoriesActions.setIsUpdating({ isUpdating: true }));

            const updatedCategory = { id, name, description, isEnabled };

            const response: Response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                body: JSON.stringify(updatedCategory),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Could not update a category"));
            }

            dispatch(categoriesActions.setLastUpdate());
        } catch (error) {
            dispatch(categoriesActions.setError({ error: (error as Error).message }));
            console.error(error);
        } finally {
            dispatch(categoriesActions.setIsUpdating({ isUpdating: false }));
        }
    };
};