import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import { BudgetDetails } from "../../../model/Budget/BudgetDetails";
import apiClient from "../../../utils/apiClient";
import { budgetsApi, type BudgetListParams } from "../budgets-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const mayBudgets: BudgetDetails[] = [
  {
    id: 1,
    key: "food",
    name: "Food",
    description: "Food budget",
    value: 500,
    categoryIds: [10],
    year: 2026,
    month: 5,
  },
];

const aprilBudgets: BudgetDetails[] = [
  {
    id: 2,
    key: "transport",
    name: "Transport",
    description: "Transport budget",
    value: 200,
    categoryIds: [20],
    year: 2026,
    month: 4,
  },
];

const mayUpdatedBudgets: BudgetDetails[] = [
  ...mayBudgets,
  {
    id: 3,
    key: "coffee",
    name: "Coffee",
    description: "Coffee budget",
    value: 75,
    categoryIds: [30],
    year: 2026,
    month: 5,
  },
];

function createTestStore() {
  return configureStore({
    reducer: {
      [budgetsApi.reducerPath]: budgetsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(budgetsApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

function listForPeriod(params?: BudgetListParams): BudgetDetails[] {
  if (params?.year === 2026 && params.month === 4) {
    return aprilBudgets;
  }
  return mayBudgets;
}

describe("budgetsApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getBudgets: typed period args create independent cache entries", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      return axiosResponse({ data: listForPeriod(request.params as BudgetListParams) });
    });

    const mayParams = { year: 2026, month: 5 };
    const aprilParams = { year: 2026, month: 4 };

    await store.dispatch(budgetsApi.endpoints.getBudgets.initiate(mayParams));
    await store.dispatch(budgetsApi.endpoints.getBudgets.initiate(aprilParams));

    expect(budgetsApi.endpoints.getBudgets.select(mayParams)(store.getState()).data).toEqual(mayBudgets);
    expect(budgetsApi.endpoints.getBudgets.select(aprilParams)(store.getState()).data).toEqual(aprilBudgets);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/budgets",
      method: "get",
      data: undefined,
      params: mayParams,
    });
  });

  it("copyBudgets: invalidates source and target period tags", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }
      const period = request.params as BudgetListParams;
      const mayResponse = mockApiClient.mock.calls.length >= 4 ? mayUpdatedBudgets : mayBudgets;
      return axiosResponse({ data: period.month === 5 ? mayResponse : aprilBudgets });
    });

    const targetParams = { year: 2026, month: 5 };
    const sourceParams = { year: 2026, month: 4 };

    store.dispatch(budgetsApi.endpoints.getBudgets.initiate(targetParams));
    store.dispatch(budgetsApi.endpoints.getBudgets.initiate(sourceParams));

    await waitFor(() => {
      expect(budgetsApi.endpoints.getBudgets.select(targetParams)(store.getState()).data).toEqual(mayBudgets);
      expect(budgetsApi.endpoints.getBudgets.select(sourceParams)(store.getState()).data).toEqual(aprilBudgets);
    });

    await store.dispatch(
      budgetsApi.endpoints.copyBudgets.initiate({
        sourceYear: 2026,
        sourceMonth: 4,
        targetYear: 2026,
        targetMonth: 5,
      }),
    );

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(5);
      expect(budgetsApi.endpoints.getBudgets.select(targetParams)(store.getState()).data).toEqual(mayUpdatedBudgets);
      expect(budgetsApi.endpoints.getBudgets.select(sourceParams)(store.getState()).data).toEqual(aprilBudgets);
    });
  });

  it("createBudget: invalidates the corresponding period list tag", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? mayUpdatedBudgets : mayBudgets;
      return axiosResponse({ data: listResponse });
    });

    const params = { year: 2026, month: 5 };
    store.dispatch(budgetsApi.endpoints.getBudgets.initiate(params));

    await waitFor(() => {
      expect(budgetsApi.endpoints.getBudgets.select(params)(store.getState()).data).toEqual(mayBudgets);
    });

    await store.dispatch(
      budgetsApi.endpoints.createBudget.initiate({
        key: "coffee",
        name: "Coffee",
        description: "Coffee budget",
        value: 75,
        categoryIds: [30],
        year: 2026,
        month: 5,
      }),
    );

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(budgetsApi.endpoints.getBudgets.select(params)(store.getState()).data).toEqual(mayUpdatedBudgets);
    });
  });

  it("getBudgets: API error surfaces as query error state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    await store.dispatch(budgetsApi.endpoints.getBudgets.initiate({ year: 2026, month: 5 }));
    const cached = budgetsApi.endpoints.getBudgets.select({ year: 2026, month: 5 })(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
