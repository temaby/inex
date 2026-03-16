import moment from "moment";
import { Moment } from "moment";

import { transactionsActions } from "./transactions-slice";

const API_BASE = "api/transactions";

export const fetchTransactions = (pageSize: number, pageNumber: number, filter: any) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsLoading({ isLoading: true }));

            const tagsStr: string = filter.tags.length > 0 ? `Tags:${filter.tags.toString()};` : "";
            const refsStr: string = filter.refs.length > 0 ? `Refs:${filter.refs.toString()};` : "";
            const accountIdsStr: string = filter.accountIds.length > 0 ? `AccountId:${filter.accountIds.toString()};` : "";
            const categoryIdsStr: string = filter.categoryIds.length > 0 ? `CategoryId:${filter.categoryIds.toString()};` : "";
            const startStr: string = filter.range.length === 2 && filter.range[0] > 0 ? `Start:${moment.unix(filter.range[0]).format("YYYY-MM-DD")};` : "";
            const endStr: string = filter.range.length === 2 && filter.range[1] > 0 ? `End:${moment.unix(filter.range[1]).format("YYYY-MM-DD")};` : "";
            const filterStr: string = accountIdsStr !== "" || categoryIdsStr !== "" || tagsStr !== "" || refsStr !== "" || startStr !== "" || endStr !== "" ?
                `&filter=${accountIdsStr}${categoryIdsStr}${startStr}${endStr}${tagsStr}${refsStr}` : "";

            const response = await fetch(`${API_BASE}?mode=active&pageSize=${pageSize}&pageNumber=${pageNumber}${filterStr}`);

            if (!response.ok) {
                throw new Error("Could not fetch transactions");
            }
            const responseJSON = await response.json();

            dispatch(transactionsActions.setTransactions({ items: responseJSON.data || [] }));
            dispatch(transactionsActions.setTotal({ total: responseJSON.metadata.totalItems }));
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(transactionsActions.setIsLoading({ isLoading: false }));
        }
    };
};

export const fetchTransactionsSummaryForAccounts = (ids: number[]) => {
    return async (dispatch: any) => {
        try {
            const idsStr: string[] = [];

            for (var i = 0; i < ids.length; i++) {
                idsStr.push(`ids[${i}]=${ids[i]}`);
            }
            const response = await fetch(`api/accounts/details?mode=active&${idsStr.join("&")}`);

            if (!response.ok) {
                throw new Error("Could not fetch transactions summary");
            }
            const responseJSON = await response.json();

            dispatch(transactionsActions.setTransactionsSummaryForAccounts({ items: responseJSON.data || [] }));
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
    };
};

export const createTransaction = (accountId: number, categoryId: number, amount: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsCreating({ isCreating: true }));

            const newTransaction = { accountId, categoryId, amount, comment, created: date.format("YYYY-MM-DD") };

            const response: Response = await fetch("api/transactions", {
                method: "POST",
                body: JSON.stringify(newTransaction),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Could not create a transaction");
            }

            const responseJSON = await response.json();
            console.log(responseJSON);
            
            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(transactionsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const createTransfer = (accountFromId: number, accountToId: number, amountFrom: number, amountTo: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsCreating({ isCreating: true }));

            const newTransaction = { accountFromId, accountToId, amountFrom, amountTo, comment, created: date.format("YYYY-MM-DD") };

            const response: Response = await fetch(`${API_BASE}/transfer`, {
                method: "POST",
                body: JSON.stringify(newTransaction),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Could not create a transaction");
            }

            const responseJSON = await response.json();
            console.log(responseJSON);

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(transactionsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const updateTransaction = (id: number, accountId: number, categoryId: number, amount: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsUpdating({ isUpdating: true }));

            const updatedTransaction = { id, accountId, categoryId, amount, comment, created: date.format("YYYY-MM-DD") };

            const response: Response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                body: JSON.stringify(updatedTransaction),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Could not update a transaction");
            }

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(transactionsActions.setIsUpdating({ isUpdating: false }));
        }
    };
};

export const removeTransaction = (id: number) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsDeleting({ isDeleting: true }));

            const response: Response = await fetch(`${API_BASE}/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Could not delete a transaction");
            }

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: (error as Error).message }));
            console.log(error);
        }
        finally {
            dispatch(transactionsActions.setIsDeleting({ isDeleting: false }));
        }
    };
};
