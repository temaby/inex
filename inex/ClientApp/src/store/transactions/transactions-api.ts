import type { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { createApi } from "@reduxjs/toolkit/query/react";
import dayjs from "dayjs";

import { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import axiosBaseQuery from "../axiosBaseQuery";
import { accountsApi } from "../accounts/accounts-api";
import { budgetReportApi } from "../budgetReport/budgetReport-api";
import { reportApi } from "../report/report-api";
import { normalizeTransactionFilter, type NormalizedTransactionFilter, type TransactionFilter } from "./transactions-slice";

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

export interface TransactionTypeCounts {
  all: number;
  income: number;
  expense: number;
  transfer: number;
}

export interface TransactionCurrencySummary {
  currency: string;
  income: number;
  expense: number;
  net: number;
}

export interface TransactionSummaryPeriod {
  startDate: string;
  endDate: string;
}

export interface TransactionCashFlowBucket {
  date: string;
  currency: string;
  income: number;
  expense: number;
  recordCount: number;
}

export interface TransactionSummaryScope {
  totalCount: number;
  typeCounts: TransactionTypeCounts;
  period: TransactionSummaryPeriod | null;
  cashFlowBuckets: TransactionCashFlowBucket[];
}

export interface TransactionSummaryResult {
  totalCount: number;
  typeCounts: TransactionTypeCounts;
  viewTypeCounts: TransactionTypeCounts;
  currencySummaries: TransactionCurrencySummary[];
  baseCurrency: string;
  currentScope: TransactionSummaryScope;
  previousScope: TransactionSummaryScope | null;
}

export const normalizeTransactionFilterParams = (
  filter: TransactionFilterParams | undefined,
): NormalizedTransactionFilter => normalizeTransactionFilter(filter ?? {});

export const formatTransactionFilterDateTime = (timestamp: number): string =>
  dayjs.unix(timestamp).format("YYYY-MM-DDTHH:mm:ss");

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

function appendTransactionFilters(
  params: URLSearchParams,
  filter: TransactionFilterParams,
): void {
  const normalizedFilter = normalizeTransactionFilterParams(filter);

  normalizedFilter.accountIds.forEach((id) => params.append("accountId", String(id)));
  normalizedFilter.categoryIds.forEach((id) => params.append("categoryId", String(id)));
  normalizedFilter.tags.forEach((tag) => params.append("tag", tag));
  normalizedFilter.refs.forEach((ref) => params.append("ref", ref));
  if (normalizedFilter.range.length === 2 && normalizedFilter.range[0] > 0) {
    params.set("startDate", formatTransactionFilterDateTime(normalizedFilter.range[0]));
  }
  if (normalizedFilter.range.length === 2 && normalizedFilter.range[1] > 0) {
    params.set("endDate", formatTransactionFilterDateTime(normalizedFilter.range[1]));
  }

  if (normalizedFilter.type !== "all") {
    params.set("type", normalizedFilter.type);
  }

  if (normalizedFilter.search) {
    params.set("search", normalizedFilter.search);
  }
}

function buildTransactionFilterParams(
  filter: TransactionFilterParams,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", "active");
  appendTransactionFilters(params, filter);
  return params;
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
  appendTransactionFilters(params, filter);
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
      serializeQueryArgs: ({ endpointName, queryArgs }) => ({
        endpointName,
        pageSize: queryArgs.pageSize,
        page: queryArgs.page,
        filter: normalizeTransactionFilterParams(queryArgs.filter),
      }),
    }),
    getTransactionsSummary: builder.query<TransactionSummaryResult, TransactionFilterParams>({
      query: (filter) => ({
        url: `/transactions/summary?${buildTransactionFilterParams(filter).toString()}`,
      }),
      providesTags: [{ type: "Transaction", id: "LIST" }],
      serializeQueryArgs: ({ endpointName, queryArgs }) => ({
        endpointName,
        filter: normalizeTransactionFilterParams(queryArgs),
      }),
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
  useGetTransactionsSummaryQuery,
  useCreateTransactionMutation,
  useCreateTransferMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
