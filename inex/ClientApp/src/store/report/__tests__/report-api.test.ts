import { configureStore } from "@reduxjs/toolkit";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import {
  reportApi,
  type HistoryReportParams,
  type HistoryReportResponse,
} from "../report-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const categoryReport = {
  data: [
    {
      id: 1,
      key: "food",
      name: "Food",
      description: "Food",
      parentId: undefined,
      value: -120,
      children: [],
    },
  ],
  metadata: {
    name: "Category",
    currency: "USD",
    internalTransfers: {
      amountReceived: 70,
      amountSent: 30,
      netChange: 40,
      transactionCount: 2,
    },
  },
};

const history2025: HistoryReportResponse = {
  data: [
    {
      month: 1,
      monthName: "January",
      income: 1000,
      expense: -500,
      savings: 500,
    },
  ],
};

const history2026: HistoryReportResponse = {
  data: [
    {
      month: 1,
      monthName: "January",
      income: 1200,
      expense: -550,
      savings: 650,
    },
  ],
};

function createTestStore() {
  return configureStore({
    reducer: {
      [reportApi.reducerPath]: reportApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(reportApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

describe("reportApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getCategoryReport: typed date-range args select cache while request uses legacy filter DSL", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(categoryReport));

    const params = { startDate: "2026-05-01", endDate: "2026-05-31" };
    await store.dispatch(reportApi.endpoints.getCategoryReport.initiate(params));

    expect(reportApi.endpoints.getCategoryReport.select(params)(store.getState()).data).toEqual(categoryReport);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/reports/category?filter=Start:2026-05-01;End:2026-05-31;",
      method: "get",
      data: undefined,
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it("getHistoryReport: typed year and currency args create independent cache entries", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      const url = request.url ?? "";
      return axiosResponse(url.includes("/2025") ? history2025 : history2026);
    });

    const params2025: HistoryReportParams = { year: 2025, currency: "USD" };
    const params2026: HistoryReportParams = { year: 2026, currency: "USD" };

    await store.dispatch(reportApi.endpoints.getHistoryReport.initiate(params2025));
    await store.dispatch(reportApi.endpoints.getHistoryReport.initiate(params2026));

    expect(reportApi.endpoints.getHistoryReport.select(params2025)(store.getState()).data).toEqual(history2025);
    expect(reportApi.endpoints.getHistoryReport.select(params2026)(store.getState()).data).toEqual(history2026);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/reports/history/2025",
      method: "get",
      data: undefined,
      params: { currency: "USD" },
      signal: expect.any(AbortSignal),
    });
  });

  it("getCategoryReport: API error surfaces as query error state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    const params = { startDate: "2026-05-01", endDate: "2026-05-31" };
    await store.dispatch(reportApi.endpoints.getCategoryReport.initiate(params));
    const cached = reportApi.endpoints.getCategoryReport.select(params)(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });

  it("getHistoryReport: API error surfaces as query error state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    const params: HistoryReportParams = { year: 2026, currency: "USD" };
    await store.dispatch(reportApi.endpoints.getHistoryReport.initiate(params));
    const cached = reportApi.endpoints.getHistoryReport.select(params)(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
