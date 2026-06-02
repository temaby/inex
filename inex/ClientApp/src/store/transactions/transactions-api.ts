import type { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { createApi } from "@reduxjs/toolkit/query/react";
import dayjs from "dayjs";

import { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import axiosBaseQuery from "../axiosBaseQuery";
import { accountsApi } from "../accounts/accounts-api";
import { budgetReportApi } from "../budgetReport/budgetReport-api";
import { reportApi } from "../report/report-api";
import type { TransactionFilter } from "./transactions-slice";

export type TransactionFilterParams = TransactionFilter;

export interface GetTransactionsArgs {
  pageSize: number;
  page: number;
  filter: TransactionFilterParams;
}

export interface TransactionsPagedResult {
  data: TransactionResponse[];
  metadata: { totalItems: number };
}

export interface CreateTransactionArgs {
  accountId: number;
  categoryId: number;
  amount: number;
  comment: string;
  created: string;
}

export interface CreateTransferArgs {
  accountFromId: number;
  accountToId: number;
  amountFrom: number;
  amountTo: number;
  comment: string;
  created: string;
}

export interface UpdateTransactionArgs {
  id: number;
  accountId: number;
  categoryId: number;
  amount: number;
  comment: string;
  created: string;
}

function buildTransactionParams(
  pageSize: number,
  page: number,
  filter: TransactionFilterParams,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", "active");
  params.set("pageSize", String(pageSize));
  params.set("page", String(page));
  filter.accountIds.forEach((id) => params.append("accountId", String(id)));
  filter.categoryIds.forEach((id) => params.append("categoryId", String(id)));
  filter.tags.forEach((tag) => params.append("tag", tag));
  filter.refs.forEach((ref) => params.append("ref", ref));
  if (filter.range.length === 2 && filter.range[0] > 0) {
    params.set("startDate", dayjs.unix(filter.range[0]).format("YYYY-MM-DD"));
  }
  if (filter.range.length === 2 && filter.range[1] > 0) {
    params.set("endDate", dayjs.unix(filter.range[1]).format("YYYY-MM-DD"));
  }
  return params;
}

const invalidateTransactionDependents = async (
  queryFulfilled: Promise<unknown>,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
) => {
  await queryFulfilled;
  dispatch(accountsApi.util.invalidateTags([{ type: "Account", id: "SUMMARY" }]));
  dispatch(budgetReportApi.util.invalidateTags(["BudgetReport"]));
  dispatch(reportApi.util.invalidateTags(["CategoryReport", "HistoryReport"]));
};

export const transactionsApi = createApi({
  reducerPath: "transactionsApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Transaction"],
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionsPagedResult, GetTransactionsArgs>({
      query: ({ pageSize, page, filter }) => ({
        url: `/transactions?${buildTransactionParams(pageSize, page, filter).toString()}`,
      }),
      providesTags: [{ type: "Transaction", id: "LIST" }],
    }),
    createTransaction: builder.mutation<void, CreateTransactionArgs>({
      query: (body) => ({ url: "/transactions", method: "post", data: body }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateTransactionDependents(queryFulfilled, dispatch);
      },
    }),
    createTransfer: builder.mutation<void, CreateTransferArgs>({
      query: (body) => ({
        url: "/transactions/transfer",
        method: "post",
        data: body,
      }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateTransactionDependents(queryFulfilled, dispatch);
      },
    }),
    updateTransaction: builder.mutation<void, UpdateTransactionArgs>({
      query: ({ id, ...body }) => ({
        url: `/transactions/${id}`,
        method: "put",
        data: { id, ...body },
      }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateTransactionDependents(queryFulfilled, dispatch);
      },
    }),
    deleteTransaction: builder.mutation<void, number>({
      query: (id) => ({ url: `/transactions/${id}`, method: "delete" }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateTransactionDependents(queryFulfilled, dispatch);
      },
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useCreateTransferMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
