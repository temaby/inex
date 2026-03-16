import { budgetsActions } from "./budgets-slice";

const API_BASE = "api/budgets";

const handleResponseError = async (response: Response, defaultMessage: string) => {
    try {
        const errorData = await response.json();
        if (errorData && errorData.messages && Array.isArray(errorData.messages)) {
            const messages = errorData.messages.map((m: any) => m.text).join('; ');
            if (messages) return new Error(messages);
        }
    } catch (e) {
        // If parsing JSON fails, fall back to default message
    }
    return new Error(defaultMessage);
};

export const fetchBudgets = (year?: number, month?: number) => {
    return async (dispatch: any) => {
        try {
            dispatch(budgetsActions.setIsLoading({ isLoading: true }));
            
            let url = API_BASE;
            const params = new URLSearchParams();
            if (year !== undefined) params.append('year', year.toString());
            if (month !== undefined) params.append('month', month.toString());
            if (params.toString()) url += '?' + params.toString();
            
            const response = await fetch(url);

            if (!response.ok) {
                throw await handleResponseError(response, "Could not fetch budgets");
            }
            const responseJSON = await response.json();
            
            const budgetItems = Array.isArray(responseJSON.data) ? responseJSON.data : (responseJSON.data ? [responseJSON.data] : []);
            
            dispatch(budgetsActions.setBudgets({ items: budgetItems }));
        } catch (error) {
            console.error("Error fetching budgets:", error);
            dispatch(budgetsActions.setError({ error: (error as Error).message }));
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
    return async (dispatch: any) => {
        try {
            dispatch(budgetsActions.setIsCreating({ isCreating: true }));

            const params = new URLSearchParams();
            params.append('sourceYear', sourceYear.toString());
            params.append('sourceMonth', sourceMonth.toString());
            params.append('targetYear', targetYear.toString());
            params.append('targetMonth', targetMonth.toString());

            const response: Response = await fetch(`${API_BASE}/copy?${params.toString()}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw await handleResponseError(response, "Could not copy budgets");
            }

            // Trigger refresh in the view
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: (error as Error).message }));
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
    return async (dispatch: any) => {
        try {
            dispatch(budgetsActions.setIsCreating({ isCreating: true }));

            const newBudget = { key, name, description, value, categoryIds, year, month };

            const response: Response = await fetch(API_BASE, {
                method: "POST",
                body: JSON.stringify(newBudget),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw await handleResponseError(response, "Could not create a budget");
            }

            const responseJSON = await response.json();

            // Trigger refresh in the view
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: (error as Error).message }));
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
    return async (dispatch: any) => {
        try {
            dispatch(budgetsActions.setIsUpdating({ isUpdating: true }));

            const updatedBudget = { id, key, name, description, value, categoryIds, year, month };

            const response: Response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                body: JSON.stringify(updatedBudget),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw await handleResponseError(response, "Could not update a budget");
            }

            // Trigger refresh in the view
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: (error as Error).message }));
            throw error;
        } finally {
            dispatch(budgetsActions.setIsUpdating({ isUpdating: false }));
        }
    };
};

export const deleteBudget = (id: number) => {
    return async (dispatch: any) => {
        try {
            const response: Response = await fetch(`${API_BASE}/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw await handleResponseError(response, "Could not delete a budget");
            }

            // Trigger refresh in the view
            dispatch(budgetsActions.setLastUpdate());
        } catch (error) {
            dispatch(budgetsActions.setError({ error: (error as Error).message }));
            throw error;
        }
    };
};
