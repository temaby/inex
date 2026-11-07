import * as React from "react";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCategoryDetails } from "../../model/Category/CategoryDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { TransactionType } from "../../model/Transaction/TransactionType";
import { transactionsApi } from "../../store/transactions/transactions-api";
import apiClient from "../../utils/apiClient";
import { useRecentCategories } from "./useRecentCategories";

vi.mock("../../utils/apiClient", () => ({ default: vi.fn() }));
const mockClient = vi.mocked(apiClient);
const categories = [1, 2].map(id => createCategoryDetails({ id, name: `Category ${id}`, isEnabled: true }));
const posting = (categoryId = 1, amount = -10): TransactionResponse => ({
    id: categoryId, categoryId, amount, created: dayjs().format("YYYY-MM-DD"),
    accountId: 1, accountCurrency: "PLN", comment: null, tags: [], refs: [],
});
const auth = createSlice({
    name: "testAuth", initialState: { user: { id: 1 } },
    reducers: { changeUser: (state, action: { payload: number }) => { state.user.id = action.payload; } },
});
const createStore = () => configureStore({
    reducer: { auth: auth.reducer, [transactionsApi.reducerPath]: transactionsApi.reducer },
    middleware: getDefault => getDefault().concat(transactionsApi.middleware),
});
const renderRecent = (store = createStore()) => renderHook(
    ({ mode, available = categories }) => useRecentCategories(available, mode),
    { initialProps: { mode: TransactionType.EXPENSE, available: categories }, wrapper: ({ children }) => <Provider store={store}>{children}</Provider> },
);

describe("useRecentCategories", () => {
    beforeEach(() => { mockClient.mockReset(); });

    it("fetches bounded date-only history once and derives both types without refetching", async () => {
        mockClient.mockResolvedValue({ data: { data: [posting(1), posting(2, 20)], metadata: { totalItems: 2 } } });
        const view = renderRecent();
        await waitFor(() => expect(view.result.current.map(item => item.id)).toEqual([1]));
        const call = mockClient.mock.calls[0][0] as unknown as { url: string };
        const params = new URL(call.url ?? "", "https://fixture.test").searchParams;
        expect(params.get("pageSize")).toBe("500");
        expect(params.get("page")).toBe("1");
        expect(params.get("startDate")).toBe(dayjs().startOf("day").subtract(29, "day").format("YYYY-MM-DDTHH:mm:ss"));
        expect(params.get("endDate")).toBe(dayjs().endOf("day").format("YYYY-MM-DDTHH:mm:ss"));
        expect(params.has("linkedUserId")).toBe(false);
        view.rerender({ mode: TransactionType.INCOME, available: categories });
        expect(view.result.current.map(item => item.id)).toEqual([2]);
        view.rerender({ mode: TransactionType.TRANSFER, available: categories });
        expect(view.result.current).toEqual([]);
        expect(mockClient).toHaveBeenCalledTimes(1);
        view.unmount();
    });

    it.each(["incomplete", "missing metadata", "failure"])("hides shortcuts for %s history", async outcome => {
        if (outcome === "failure") mockClient.mockRejectedValue({ response: { status: 503, data: {} } });
        else mockClient.mockResolvedValue({ data: { data: [posting()], ...(outcome === "incomplete" ? { metadata: { totalItems: 501 } } : {}) } });
        const store = createStore();
        const view = renderRecent(store);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(Object.values(store.getState().transactionsApi.queries)[0]?.status).toMatch(/fulfilled|rejected/));
        expect(view.result.current).toEqual([]);
        view.unmount();
    });

    it("ignores retained cache and waits for a fresh opening response", async () => {
        mockClient.mockResolvedValueOnce({ data: { data: [posting(1)], metadata: { totalItems: 1 } } });
        const store = createStore();
        const first = renderRecent(store);
        await waitFor(() => expect(first.result.current[0]?.id).toBe(1));
        first.unmount();
        let resolveFresh!: (value: { data: { data: TransactionResponse[]; metadata: { totalItems: number } } }) => void;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveFresh = resolve; }));
        const second = renderRecent(store);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(2));
        expect(second.result.current).toEqual([]);
        await act(async () => { resolveFresh({ data: { data: [posting(2)], metadata: { totalItems: 1 } } }); });
        await waitFor(() => expect(second.result.current[0]?.id).toBe(2));
        second.unmount();
    });

    it("hides old-user results immediately and ignores a late old-user response", async () => {
        let resolveOld!: (value: { data: { data: TransactionResponse[]; metadata: { totalItems: number } } }) => void;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
        mockClient.mockResolvedValueOnce({ data: { data: [posting(2)], metadata: { totalItems: 1 } } });
        const store = createStore();
        const view = renderRecent(store);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(1));
        act(() => { store.dispatch(auth.actions.changeUser(2)); });
        expect(view.result.current).toEqual([]);
        await waitFor(() => expect(view.result.current[0]?.id).toBe(2));
        await act(async () => { resolveOld({ data: { data: [posting(1)], metadata: { totalItems: 1 } } }); });
        expect(view.result.current[0]?.id).toBe(2);
        expect(mockClient).toHaveBeenCalledTimes(2);
        view.unmount();
    });

    it("does not request history without eligible categories", async () => {
        const store = createStore();
        const view = renderHook(() => useRecentCategories([], TransactionType.EXPENSE), {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await act(async () => undefined);
        expect(mockClient).not.toHaveBeenCalled();
        expect(view.result.current).toEqual([]);
        view.unmount();
    });

    it("rechecks eligibility without another request and releases its completed subscription", async () => {
        mockClient.mockResolvedValue({ data: { data: [posting()], metadata: { totalItems: 1 } } });
        const store = createStore();
        const view = renderRecent(store);
        await waitFor(() => expect(view.result.current[0]?.id).toBe(1));
        view.rerender({ mode: TransactionType.EXPENSE, available: [{ ...categories[0], isEnabled: false }, categories[1]] });
        expect(view.result.current).toEqual([]);
        await act(async () => { store.dispatch(transactionsApi.util.invalidateTags([{ type: "Transaction", id: "LIST" }])); });
        expect(mockClient).toHaveBeenCalledTimes(1);
        view.unmount();
    });

    it("aborts the pending one-off request when the form closes", async () => {
        mockClient.mockImplementationOnce(() => new Promise(() => undefined));
        const view = renderRecent();
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(1));
        const request = mockClient.mock.calls[0][0] as unknown as { signal: AbortSignal };
        expect(request.signal.aborted).toBe(false);
        view.unmount();
        expect(request.signal.aborted).toBe(true);
    });

    it("starts a fresh request after immediate close and reopen while the old request is unresolved", async () => {
        let resolveOld!: (value: { data: { data: TransactionResponse[]; metadata: { totalItems: number } } }) => void;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
        mockClient.mockResolvedValueOnce({ data: { data: [posting(2)], metadata: { totalItems: 1 } } });
        const store = createStore();
        const first = renderRecent(store);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(1));
        // Deliberately leave no awaited cleanup between unmount and remount.
        first.unmount();
        store.dispatch(auth.actions.changeUser(2));
        const second = renderRecent(store);
        expect(second.result.current).toEqual([]);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(second.result.current[0]?.id).toBe(2));
        await act(async () => { resolveOld({ data: { data: [posting(1)], metadata: { totalItems: 1 } } }); });
        expect(second.result.current[0]?.id).toBe(2);
        second.unmount();
    });

    it("does not expose stale same-user cache after aborting a refresh and immediately reopening", async () => {
        mockClient.mockResolvedValueOnce({ data: { data: [posting(1)], metadata: { totalItems: 1 } } });
        const store = createStore();
        const first = renderRecent(store);
        await waitFor(() => expect(first.result.current[0]?.id).toBe(1));
        first.unmount();

        let resolveAborted!: (value: { data: { data: TransactionResponse[]; metadata: { totalItems: number } } }) => void;
        let resolveFresh!: (value: { data: { data: TransactionResponse[]; metadata: { totalItems: number } } }) => void;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveAborted = resolve; }));
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveFresh = resolve; }));
        const refresh = renderRecent(store);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(2));
        expect(refresh.result.current).toEqual([]);
        refresh.unmount();
        const reopened = renderRecent(store);
        expect(reopened.result.current).toEqual([]);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(3));
        expect(reopened.result.current).toEqual([]);
        await act(async () => { resolveAborted({ data: { data: [posting(1)], metadata: { totalItems: 1 } } }); });
        expect(reopened.result.current).toEqual([]);
        await act(async () => { resolveFresh({ data: { data: [posting(2)], metadata: { totalItems: 1 } } }); });
        await waitFor(() => expect(reopened.result.current[0]?.id).toBe(2));
        reopened.unmount();
    });
});
