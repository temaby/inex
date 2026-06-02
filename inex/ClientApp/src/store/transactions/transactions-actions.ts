import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { transactionsActions } from "./transactions-slice";
import { AccountSummary } from "../../model/Account/AccountSummary";
import { TransactionFilterState } from "../../model/Transaction/TransactionFilterState";
import { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import type { AppDispatch } from "../index";

const API_BASE = "/transactions";

export const fetchTransactions = (pageSize: number, page: number, filter: TransactionFilterState) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(transactionsActions.setIsLoading({ isLoading: true }));

            const params = new URLSearchParams();
            params.set("mode", "active");
            params.set("pageSize", String(pageSize));
            params.set("page", String(page));

            filter.accountIds.forEach(id => params.append("accountId", String(id)));
            filter.categoryIds.forEach(id => params.append("categoryId", String(id)));
            filter.tags.forEach(tag => params.append("tag", tag));
            filter.refs.forEach(ref => params.append("ref", ref));

            if (filter.range.length === 2 && filter.range[0] > 0) {
                params.set("startDate", dayjs.unix(filter.range[0]).format("YYYY-MM-DD"));
            }
            if (filter.range.length === 2 && filter.range[1] > 0) {
                params.set("endDate", dayjs.unix(filter.range[1]).format("YYYY-MM-DD"));
            }

            const { data } = await apiClient.get<{ data: TransactionResponse[]; metadata: { totalItems: number } }>(
                `${API_BASE}?${params.toString()}`
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
    return async (dispatch: AppDispatch) => {
        try {
            const idsStr = ids.map((id, i) => `ids[${i}]=${id}`).join("&");
            const { data } = await apiClient.get<{ data: AccountSummary[] }>(`/accounts/details?mode=active&${idsStr}`);
            dispatch(transactionsActions.setTransactionsSummaryForAccounts({ items: data.data || [] }));
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, "Could not fetch transactions summary") }));
        }
    };
};

export const createTransaction = (accountId: number, categoryId: number, amount: number, comment: string, date: Dayjs) => {
    return async (dispatch: AppDispatch) => {
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

export const createTransfer = (accountFromId: number, accountToId: number, amountFrom: number, amountTo: number, comment: string, date: Dayjs) => {
    return async (dispatch: AppDispatch) => {
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

export const updateTransaction = (id: number, accountId: number, categoryId: number, amount: number, comment: string, date: Dayjs) => {
    return async (dispatch: AppDispatch) => {
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
    return async (dispatch: AppDispatch) => {
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
