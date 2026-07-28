import { configureStore } from "@reduxjs/toolkit";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import { BudgetReportResponse } from "../../../model/Report/BudgetReport";
import apiClient from "../../../utils/apiClient";
import { budgetReportApi, type BudgetReportParams } from "../budgetReport-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const usdReport: BudgetReportResponse = {
  data: [
    {
      categoryName: "Food",
      categoryIds: [1],
      budgetedAmount: 500,
      spentAmount: 250,
      remainingAmount: 250,
      percentageUsed: 50,
    },
  ],
  metadata: {
    name: "Budget",
    currency: "USD",
    start: "2026-05-01",
    end: "2026-05-31",
    totalIncome: 1000,
    totalOutcome: 250,
  },
};

const eurReport: BudgetReportResponse = {
  ...usdReport,
  metadata: {
    ...usdReport.metadata,
    currency: "EUR",
  },
};

function createTestStore() {
  return configureStore({
    reducer: {
      [budgetReportApi.reducerPath]: budgetReportApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(budgetReportApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

describe("budgetReportApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getBudgetReport: typed period and currency args create independent cache entries", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      const params = request.params as BudgetReportParams;
      return axiosResponse(params.currency === "EUR" ? eurReport : usdReport);
    });

    const usdParams = { year: 2026, month: 5, currency: "USD" };
    const eurParams = { year: 2026, month: 5, currency: "EUR" };

    await store.dispatch(budgetReportApi.endpoints.getBudgetReport.initiate(usdParams));
    await store.dispatch(budgetReportApi.endpoints.getBudgetReport.initiate(eurParams));

    expect(budgetReportApi.endpoints.getBudgetReport.select(usdParams)(store.getState()).data).toEqual(usdReport);
    expect(budgetReportApi.endpoints.getBudgetReport.select(eurParams)(store.getState()).data).toEqual(eurReport);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/reports/budget/comparison",
      method: "get",
      data: undefined,
      params: usdParams,
      signal: expect.any(AbortSignal),
    });
  });

  it("getBudgetReport: API error surfaces as query error state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    const params = { year: 2026, month: 5, currency: "USD" };
    await store.dispatch(budgetReportApi.endpoints.getBudgetReport.initiate(params));
    const cached = budgetReportApi.endpoints.getBudgetReport.select(params)(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
