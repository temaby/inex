import moment from "moment";
import { Moment } from "moment";

import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { transactionsActions } from "./transactions-slice";

const API_BASE = "/transactions";

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

            const { data } = await apiClient.get(
                `${API_BASE}?mode=active&pageSize=${pageSize}&pageNumber=${pageNumber}${filterStr}`
            );

            dispatch(transactionsActions.setTransactions({ items: data.data || [] }));
            dispatch(transactionsActions.setTotal({ total: data.metadata.totalItems }));
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not fetch transactions") }));
        } finally {
            dispatch(transactionsActions.setIsLoading({ isLoading: false }));
        }
    };
};

export const fetchTransactionsSummaryForAccounts = (ids: number[]) => {
    return async (dispatch: any) => {
        try {
            const idsStr = ids.map((id, i) => `ids[${i}]=${id}`).join("&");
            const { data } = await apiClient.get(`/accounts/details?mode=active&${idsStr}`);
            dispatch(transactionsActions.setTransactionsSummaryForAccounts({ items: data.data || [] }));
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not fetch transactions summary") }));
        }
    };
};

export const createTransaction = (accountId: number, categoryId: number, amount: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsCreating({ isCreating: true }));

            await apiClient.post(API_BASE, {
                accountId, categoryId, amount, comment,
                created: date.format("YYYY-MM-DD"),
            });

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not create a transaction") }));
        } finally {
            dispatch(transactionsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const createTransfer = (accountFromId: number, accountToId: number, amountFrom: number, amountTo: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsCreating({ isCreating: true }));

            await apiClient.post(`${API_BASE}/transfer`, {
                accountFromId, accountToId, amountFrom, amountTo, comment,
                created: date.format("YYYY-MM-DD"),
            });

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not create a transfer") }));
        } finally {
            dispatch(transactionsActions.setIsCreating({ isCreating: false }));
        }
    };
};

export const updateTransaction = (id: number, accountId: number, categoryId: number, amount: number, comment: string, date: Moment) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsUpdating({ isUpdating: true }));

            await apiClient.put(`${API_BASE}/${id}`, {
                id, accountId, categoryId, amount, comment,
                created: date.format("YYYY-MM-DD"),
            });

            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not update a transaction") }));
        } finally {
            dispatch(transactionsActions.setIsUpdating({ isUpdating: false }));
        }
    };
};

export const removeTransaction = (id: number) => {
    return async (dispatch: any) => {
        try {
            dispatch(transactionsActions.setIsDeleting({ isDeleting: true }));

            await apiClient.delete(`${API_BASE}/${id}`);
            dispatch(transactionsActions.setLastUpdate());
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not delete a transaction") }));
        } finally {
            dispatch(transactionsActions.setIsDeleting({ isDeleting: false }));
        }
    };
};
