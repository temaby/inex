import { createApi } from "@reduxjs/toolkit/query/react";

import { ReportCategoryDetails } from "../../model/Report/ReportCategoryDetails";
import axiosBaseQuery from "../axiosBaseQuery";

export interface CategoryReportParams {
  startDate: string;
  endDate: string;
  currency: string;
  linkedUserId?: number | null;
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
  linkedUserId?: number | null;
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
      query: ({ startDate, endDate, currency, linkedUserId }) => ({
        url: `/reports/category?filter=Start:${startDate};End:${endDate};`,
        params: { currency, linkedUserId: linkedUserId ?? undefined },
      }),
      providesTags: (result, error, { startDate, endDate, currency, linkedUserId }) => [
        { type: "CategoryReport", id: `${linkedUserId ?? "self"}:${startDate}_${endDate}-${currency}` },
      ],
    }),
    getHistoryReport: builder.query<HistoryReportResponse, HistoryReportParams>({
      query: ({ year, currency, linkedUserId }) => ({
        url: `/reports/history/${year}`,
        params: { currency, linkedUserId: linkedUserId ?? undefined },
      }),
      providesTags: (result, error, { year, currency, linkedUserId }) => [
        { type: "HistoryReport", id: `${linkedUserId ?? "self"}:${year}-${currency}` },
      ],
    }),
  }),
});

export const { useGetCategoryReportQuery, useGetHistoryReportQuery } = reportApi;
