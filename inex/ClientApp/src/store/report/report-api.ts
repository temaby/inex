import { createApi } from "@reduxjs/toolkit/query/react";

import { ReportCategoryDetails } from "../../model/Report/ReportCategoryDetails";
import axiosBaseQuery from "../axiosBaseQuery";

export interface CategoryReportParams {
  startDate: string;
  endDate: string;
}

export interface InternalTransferSummary {
  amountReceived: number;
  amountSent: number;
  netChange: number;
  transactionCount: number;
}

export interface CategoryReportResponse {
  data: ReportCategoryDetails[];
  metadata: {
    name: string;
    currency: string;
    internalTransfers: InternalTransferSummary;
  };
}

export interface HistoryReportParams {
  year: number;
  currency: string;
}

export interface HistoryReportItem {
  month: number;
  monthName: string;
  income: number;
  expense: number;
  savings: number;
}

export interface HistoryReportResponse {
  data: HistoryReportItem[];
}

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["CategoryReport", "HistoryReport"],
  endpoints: (builder) => ({
    getCategoryReport: builder.query<CategoryReportResponse, CategoryReportParams>({
      query: ({ startDate, endDate }) => ({
        url: `/reports/category?filter=Start:${startDate};End:${endDate};`,
      }),
      providesTags: (result, error, { startDate, endDate }) => [
        { type: "CategoryReport", id: `${startDate}_${endDate}` },
      ],
    }),
    getHistoryReport: builder.query<HistoryReportResponse, HistoryReportParams>({
      query: ({ year, currency }) => ({
        url: `/reports/history/${year}`,
        params: { currency },
      }),
      providesTags: (result, error, { year, currency }) => [
        { type: "HistoryReport", id: `${year}-${currency}` },
      ],
    }),
  }),
});

export const { useGetCategoryReportQuery, useGetHistoryReportQuery } = reportApi;
