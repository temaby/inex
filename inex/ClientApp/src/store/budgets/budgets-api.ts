import type { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { createApi } from "@reduxjs/toolkit/query/react";

import { BudgetDetails } from "../../model/Budget/BudgetDetails";
import axiosBaseQuery from "../axiosBaseQuery";
import { budgetReportApi } from "../budgetReport/budgetReport-api";

interface ListResponse<T> {
  data: T[];
}

export interface BudgetListParams {
  year: number;
  month: number;
}

export interface BudgetCreateRequest {
  key: string;
  name: string;
  description: string;
  value: number;
  categoryIds: number[];
  year: number;
  month: number;
}

export interface BudgetUpdateRequest extends BudgetCreateRequest {
  id: number;
}

export interface BudgetDeleteRequest {
  id: number;
  year: number;
  month: number;
}

export interface CopyBudgetsRequest {
  sourceYear: number;
  sourceMonth: number;
  targetYear: number;
  targetMonth: number;
}

const budgetPeriodTag = ({ year, month }: BudgetListParams) => `${year}-${month}`;

const invalidateBudgetReport = async (
  queryFulfilled: Promise<unknown>,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
) => {
  await queryFulfilled;
  dispatch(budgetReportApi.util.invalidateTags(["BudgetReport"]));
};

export const budgetsApi = createApi({
  reducerPath: "budgetsApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["BudgetsList"],
  endpoints: (builder) => ({
    getBudgets: builder.query<BudgetDetails[], BudgetListParams>({
      query: ({ year, month }) => ({
        url: "/budgets",
        params: { year, month },
      }),
      transformResponse: (response: ListResponse<BudgetDetails>) =>
        response.data ?? [],
      providesTags: (result, error, params) => [
        { type: "BudgetsList", id: budgetPeriodTag(params) },
      ],
    }),
    createBudget: builder.mutation<void, BudgetCreateRequest>({
      query: (body) => ({ url: "/budgets", method: "post", data: body }),
      invalidatesTags: (result, error, { year, month }) => [
        { type: "BudgetsList", id: budgetPeriodTag({ year, month }) },
      ],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateBudgetReport(queryFulfilled, dispatch);
      },
    }),
    updateBudget: builder.mutation<void, BudgetUpdateRequest>({
      query: ({ id, ...body }) => ({
        url: `/budgets/${id}`,
        method: "put",
        data: { id, ...body },
      }),
      invalidatesTags: (result, error, { year, month }) => [
        { type: "BudgetsList", id: budgetPeriodTag({ year, month }) },
      ],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateBudgetReport(queryFulfilled, dispatch);
      },
    }),
    deleteBudget: builder.mutation<void, BudgetDeleteRequest>({
      query: ({ id }) => ({ url: `/budgets/${id}`, method: "delete" }),
      invalidatesTags: (result, error, { year, month }) => [
        { type: "BudgetsList", id: budgetPeriodTag({ year, month }) },
      ],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateBudgetReport(queryFulfilled, dispatch);
      },
    }),
    copyBudgets: builder.mutation<void, CopyBudgetsRequest>({
      query: ({ sourceYear, sourceMonth, targetYear, targetMonth }) => ({
        url: "/budgets/copy",
        method: "post",
        params: { sourceYear, sourceMonth, targetYear, targetMonth },
      }),
      invalidatesTags: (result, error, params) => [
        {
          type: "BudgetsList",
          id: `${params.targetYear}-${params.targetMonth}`,
        },
        {
          type: "BudgetsList",
          id: `${params.sourceYear}-${params.sourceMonth}`,
        },
      ],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await invalidateBudgetReport(queryFulfilled, dispatch);
      },
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useCopyBudgetsMutation,
} = budgetsApi;
