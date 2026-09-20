import { createApi } from "@reduxjs/toolkit/query/react";

import { BudgetReportResponse } from "../../model/Report/BudgetReport";
import axiosBaseQuery from "../axiosBaseQuery";

export interface BudgetReportParams {
  year: number;
  month: number;
  currency: string;
  linkedUserId?: number | null;
}

const budgetReportTag = ({ year, month, currency, linkedUserId }: BudgetReportParams) =>
  `${linkedUserId ?? "self"}:${year}-${month}-${currency}`;

export const budgetReportApi = createApi({
  reducerPath: "budgetReportApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["BudgetReport"],
  endpoints: (builder) => ({
    getBudgetReport: builder.query<BudgetReportResponse, BudgetReportParams>({
      query: ({ year, month, currency, linkedUserId }) => ({
        url: "/reports/budget/comparison",
        params: { year, month, currency, linkedUserId: linkedUserId ?? undefined },
      }),
      providesTags: (result, error, params) => [
        { type: "BudgetReport", id: budgetReportTag(params) },
      ],
    }),
  }),
});

export const { useGetBudgetReportQuery } = budgetReportApi;
