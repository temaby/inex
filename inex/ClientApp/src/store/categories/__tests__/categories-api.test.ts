import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import { categoriesApi, type CategoryResponse } from "../categories-api";

vi.mock("../../../utils/apiClient", () => ({
  default: vi.fn(),
}));

const mockApiClient = vi.mocked(apiClient);

const categoriesFixture: CategoryResponse[] = [
  {
    id: 1,
    key: "food",
    name: "Food",
    description: null,
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
];

const categoriesUpdatedFixture: CategoryResponse[] = [
  ...categoriesFixture,
  {
    id: 2,
    key: "groceries",
    name: "Groceries",
    description: "Market",
    parentId: 1,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
];

function createTestStore() {
  return configureStore({
    reducer: {
      [categoriesApi.reducerPath]: categoriesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(categoriesApi.middleware),
  });
}

function axiosResponse<T>(data: T): Pick<AxiosResponse<T>, "data"> {
  return { data };
}

describe("categoriesApi", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it("getCategories: unwraps backend list wrapper and caches result", async () => {
    const store = createTestStore();
    mockApiClient.mockResolvedValue(axiosResponse({ data: categoriesFixture }));

    const result = await store.dispatch(categoriesApi.endpoints.getCategories.initiate("ALL"));
    const cached = categoriesApi.endpoints.getCategories.select("ALL")(store.getState());

    expect(result.data).toEqual(categoriesFixture);
    expect(cached.data).toEqual(categoriesFixture);
    expect(mockApiClient).toHaveBeenCalledWith({
      url: "/categories?mode=ALL",
      method: "get",
      data: undefined,
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it("createCategory: invalidates Category/LIST and refetches list", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "post") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? categoriesUpdatedFixture : categoriesFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(categoriesApi.endpoints.getCategories.initiate("ALL"));

    await waitFor(() => {
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual(categoriesFixture);
    });

    await store.dispatch(categoriesApi.endpoints.createCategory.initiate({
      key: "groceries",
      name: "Groceries",
      description: "Market",
      isEnabled: true,
      parentId: 1,
    }));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual(categoriesUpdatedFixture);
    });
  });

  it("updateCategory: sends existing key and invalidates Category/id plus Category/LIST", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "put") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? categoriesUpdatedFixture : categoriesFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(categoriesApi.endpoints.getCategories.initiate("ALL"));

    await waitFor(() => {
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual(categoriesFixture);
    });

    await store.dispatch(categoriesApi.endpoints.updateCategory.initiate({
      id: 1,
      key: "food",
      name: "Food",
      description: "",
      isEnabled: false,
    }));

    expect(mockApiClient).toHaveBeenCalledWith(expect.objectContaining({
      url: "/categories/1",
      method: "put",
      data: expect.objectContaining({ key: "food" }),
    }));
    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual(categoriesUpdatedFixture);
    });
  });

  it("deleteCategory: invalidates Category/id and Category/LIST and refetches list", async () => {
    const store = createTestStore();
    mockApiClient.mockImplementation(async (config) => {
      const request = config as AxiosRequestConfig;
      if (request.method === "delete") {
        return axiosResponse(undefined);
      }
      const listResponse = mockApiClient.mock.calls.length >= 3 ? [] : categoriesFixture;
      return axiosResponse({ data: listResponse });
    });

    store.dispatch(categoriesApi.endpoints.getCategories.initiate("ALL"));

    await waitFor(() => {
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual(categoriesFixture);
    });

    await store.dispatch(categoriesApi.endpoints.deleteCategory.initiate(1));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(categoriesApi.endpoints.getCategories.select("ALL")(store.getState()).data).toEqual([]);
    });
  });

  it("getCategories: API error propagates to isError state", async () => {
    const store = createTestStore();
    const error = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
    } as AxiosError;
    mockApiClient.mockRejectedValue(error);

    await store.dispatch(categoriesApi.endpoints.getCategories.initiate("ALL"));
    const cached = categoriesApi.endpoints.getCategories.select("ALL")(store.getState());

    expect(cached.isError).toBe(true);
    expect(cached.error).toMatchObject({ status: 500 });
  });
});
