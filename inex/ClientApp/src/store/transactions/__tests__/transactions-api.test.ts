import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import dayjs from "dayjs";
import { vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import {
  transactionsApi,
  type GetTransactionsArgs,
  type TransactionSummaryResult,
  type TransactionsPagedResult,
} from "../transactions-api";

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

const summaryFixture: TransactionSummaryResult = {
  totalCount: 2,
  typeCounts: {
    all: 2,
    income: 1,
    expense: 1,
    transfer: 0,
  },
  currencySummaries: [
    {
      currency: "USD",
      income: 100,
      expense: -42,
      net: 58,
    },
  ],
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
      signal: expect.any(AbortSignal),
    });
  });

  it("serializes transaction range filters with times so final-day activity is included", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(fixture));

    await store.dispatch(
      transactionsApi.endpoints.getTransactions.initiate({
        pageSize: 25,
        page: 1,
        filter: {
          ...emptyFilter,
          range: [
            dayjs("2026-06-01T00:00:00").unix(),
            dayjs("2026-06-30T23:59:59").unix(),
          ],
        },
      }),
    );

    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/transactions?mode=active&pageSize=25&page=1&startDate=2026-06-01T00%3A00%3A00&endDate=2026-06-30T23%3A59%3A59",
      method: "get",
      data: undefined,
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it("getTransactionsSummary: serializes the same filters without pagination", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(summaryFixture));

    await store.dispatch(
      transactionsApi.endpoints.getTransactionsSummary.initiate({
        accountIds: [10],
        categoryIds: [20],
        tags: ["food"],
        refs: ["alice"],
        range: [
          dayjs("2026-06-01T00:00:00").unix(),
          dayjs("2026-06-30T23:59:59").unix(),
        ],
      }),
    );

    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/transactions/summary?mode=active&accountId=10&categoryId=20&tag=food&ref=alice&startDate=2026-06-01T00%3A00%3A00&endDate=2026-06-30T23%3A59%3A59",
      method: "get",
      data: undefined,
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it("serializes normalized Type and Search for both list and summary", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(fixture));
    const filter = { ...emptyFilter, type: "expense" as const, search: "  groceries  " };

    await store.dispatch(transactionsApi.endpoints.getTransactions.initiate({ pageSize: 25, page: 1, filter }));
    await store.dispatch(transactionsApi.endpoints.getTransactionsSummary.initiate(filter));

    expect(mockApiClient).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: "/transactions?mode=active&pageSize=25&page=1&type=expense&search=groceries",
    }));
    expect(mockApiClient).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: "/transactions/summary?mode=active&type=expense&search=groceries",
    }));
  });

  it("omits blank Search and the all Type from transaction query parameters", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(fixture));

    await store.dispatch(transactionsApi.endpoints.getTransactions.initiate({
      pageSize: 25,
      page: 1,
      filter: { ...emptyFilter, type: "all", search: "   " },
    }));

    expect(mockApiClient).toHaveBeenCalledWith(expect.objectContaining({
      url: "/transactions?mode=active&pageSize=25&page=1",
    }));
  });

  it("shares a cache entry for equivalent normalized Type and Search filters", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse(fixture));
    const firstArgs = {
      pageSize: 25,
      page: 1,
      filter: { ...emptyFilter, type: "expense" as const, search: "  groceries  " },
    };
    const equivalentArgs = {
      pageSize: 25,
      page: 1,
      filter: { ...emptyFilter, type: "expense" as const, search: "groceries" },
    };

    await store.dispatch(transactionsApi.endpoints.getTransactions.initiate(firstArgs));
    await store.dispatch(transactionsApi.endpoints.getTransactions.initiate(equivalentArgs));

    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(transactionsApi.endpoints.getTransactions.select(equivalentArgs)(store.getState()).data).toEqual(fixture);
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

  it("cache invalidation on mutation refreshes subscribed summary data", async () => {
    const store = createTestStore();
    const updatedSummary: TransactionSummaryResult = {
      ...summaryFixture,
      totalCount: 3,
      typeCounts: { ...summaryFixture.typeCounts, all: 3, expense: 2 },
      currencySummaries: [
        { currency: "USD", income: 100, expense: -54, net: 46 },
      ],
    };
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }

      const summaryResponse = mockApiClient.mock.calls.length >= 3 ? updatedSummary : summaryFixture;
      return axiosResponse(summaryResponse);
    });

    store.dispatch(transactionsApi.endpoints.getTransactionsSummary.initiate(emptyFilter));

    await waitFor(() => {
      expect(transactionsApi.endpoints.getTransactionsSummary.select(emptyFilter)(store.getState()).data).toEqual(summaryFixture);
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
      expect(transactionsApi.endpoints.getTransactionsSummary.select(emptyFilter)(store.getState()).data).toEqual(updatedSummary);
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
