import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import { transactionsApi, type GetTransactionsArgs, type TransactionsPagedResult } from "../transactions-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const emptyFilter = {
  accountIds: [],
  categoryIds: [],
  tags: [],
  refs: [],
  range: [],
};

const args: GetTransactionsArgs = {
  pageSize: 25,
  page: 1,
  filter: emptyFilter,
};

const fixture: TransactionsPagedResult = {
  data: [
    {
      id: 1,
      accountId: 2,
      categoryId: 3,
      amount: -42,
      comment: "Lunch",
      created: "2026-06-02",
      tags: ["food"],
      refs: [],
      accountCurrency: "USD",
    },
  ],
  metadata: { totalItems: 1 },
};

const updatedFixture: TransactionsPagedResult = {
  data: [
    ...fixture.data,
    {
      id: 2,
      accountId: 2,
      categoryId: 3,
      amount: -12,
      comment: "Coffee",
      created: "2026-06-02",
      tags: [],
      refs: [],
      accountCurrency: "USD",
    },
  ],
  metadata: { totalItems: 2 },
};

function createTestStore() {
  return configureStore({
    reducer: {
      [transactionsApi.reducerPath]: transactionsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(transactionsApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

describe("transactionsApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getTransactions: successful fetch caches result", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(fixture));

    const result = await store.dispatch(transactionsApi.endpoints.getTransactions.initiate(args));
    const cached = transactionsApi.endpoints.getTransactions.select(args)(store.getState());

    expect(result.data?.data).toEqual(fixture.data);
    expect(cached.data).toEqual(fixture);
    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/transactions?mode=active&pageSize=25&page=1",
      method: "get",
      data: undefined,
      params: undefined,
    });
  });

  it("cache invalidation on mutation triggers refetch", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }

      const listResponse = mockApiClient.mock.calls.length >= 3 ? updatedFixture : fixture;
      return axiosResponse(listResponse);
    });

    store.dispatch(transactionsApi.endpoints.getTransactions.initiate(args));

    await waitFor(() => {
      expect(transactionsApi.endpoints.getTransactions.select(args)(store.getState()).data).toEqual(fixture);
    });

    await store.dispatch(
      transactionsApi.endpoints.createTransaction.initiate({
        accountId: 2,
        categoryId: 3,
        amount: -12,
        comment: "Coffee",
        created: "2026-06-02",
      }),
    );

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(transactionsApi.endpoints.getTransactions.select(args)(store.getState()).data).toEqual(updatedFixture);
    });
  });

  it("API error propagates to isError state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    await store.dispatch(transactionsApi.endpoints.getTransactions.initiate(args));
    const cached = transactionsApi.endpoints.getTransactions.select(args)(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
