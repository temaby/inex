import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import { accountsApi, type AccountResponse, type AccountSummary } from "../accounts-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const accountsFixture: AccountResponse[] = [
  {
    id: 1,
    key: "cash",
    name: "Cash",
    description: null,
    isEnabled: true,
    currencyId: 1,
    currency: "USD",
  },
];

const accountsUpdatedFixture: AccountResponse[] = [
  ...accountsFixture,
  {
    id: 2,
    key: "bank",
    name: "Bank",
    description: "Main",
    isEnabled: true,
    currencyId: 1,
    currency: "USD",
  },
];

const summaryFixture: AccountSummary[] = [
  {
    ...accountsFixture[0],
    value: 125,
    thisMonthNet: -15,
  },
];

function createTestStore() {
  return configureStore({
    reducer: {
      [accountsApi.reducerPath]: accountsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(accountsApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

describe("accountsApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getAccounts: unwraps backend list wrapper and caches result", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse({ data: accountsFixture }));

    const result = await store.dispatch(accountsApi.endpoints.getAccounts.initiate("ALL"));
    const cached = accountsApi.endpoints.getAccounts.select("ALL")(store.getState());

    expect(result.data).toEqual(accountsFixture);
    expect(cached.data).toEqual(accountsFixture);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/accounts?mode=ALL",
      method: "get",
      data: undefined,
      params: undefined,
    });
  });

  it("getAccountsSummary: unwraps backend list wrapper and caches result", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse({ data: summaryFixture }));

    const result = await store.dispatch(accountsApi.endpoints.getAccountsSummary.initiate([1]));
    const cached = accountsApi.endpoints.getAccountsSummary.select([1])(store.getState());

    expect(result.data).toEqual(summaryFixture);
    expect(cached.data).toEqual(summaryFixture);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/accounts/details?mode=active&ids[0]=1",
      method: "get",
      data: undefined,
      params: undefined,
    });
  });

  it("createAccount: invalidates Account/LIST and refetches list", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? accountsUpdatedFixture : accountsFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(accountsApi.endpoints.getAccounts.initiate("ALL"));

    await waitFor(() => {
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual(accountsFixture);
    });

    await store.dispatch(accountsApi.endpoints.createAccount.initiate({
      key: "bank",
      name: "Bank",
      description: "Main",
      currencyId: 1,
      isEnabled: true,
    }));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual(accountsUpdatedFixture);
    });
  });

  it("updateAccount: invalidates Account/id and Account/LIST and refetches list", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "put") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? accountsUpdatedFixture : accountsFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(accountsApi.endpoints.getAccounts.initiate("ALL"));

    await waitFor(() => {
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual(accountsFixture);
    });

    await store.dispatch(accountsApi.endpoints.updateAccount.initiate({
      id: 1,
      key: "cash",
      name: "Cash",
      description: "",
      currencyId: 1,
      isEnabled: false,
    }));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual(accountsUpdatedFixture);
    });
  });

  it("deleteAccount: invalidates Account/id and Account/LIST and refetches list", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "delete") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? [] : accountsFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(accountsApi.endpoints.getAccounts.initiate("ALL"));

    await waitFor(() => {
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual(accountsFixture);
    });

    await store.dispatch(accountsApi.endpoints.deleteAccount.initiate(1));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(accountsApi.endpoints.getAccounts.select("ALL")(store.getState()).data).toEqual([]);
    });
  });

  it("getAccounts: API error propagates to isError state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    await store.dispatch(accountsApi.endpoints.getAccounts.initiate("ALL"));
    const cached = accountsApi.endpoints.getAccounts.select("ALL")(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
