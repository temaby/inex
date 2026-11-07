import { configureStore, createSlice } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../../../utils/apiClient";
import { transactionsApi } from "../transactions-api";

vi.mock("../../../utils/apiClient", () => ({ default: vi.fn() }));
const client = vi.mocked(apiClient);
const auth = createSlice({ name: "auth", initialState: { user: { id: 1 } },
    reducers: { change: (state, action: { payload: number }) => { state.user.id = action.payload; } } });
const createStore = () => configureStore({ reducer: { auth: auth.reducer, [transactionsApi.reducerPath]: transactionsApi.reducer },
    middleware: getDefault => getDefault().concat(transactionsApi.middleware) });
const args = { userId: 1, type: "tag" as const, query: "MA" };

describe("comment suggestions API", () => {
    beforeEach(() => { client.mockReset(); client.mockResolvedValue({ data: { suggestions: ["market"] } }); });
    afterEach(() => { vi.useRealTimers(); });

    it("normalizes searches, separates identities/types, and never sends ownership parameters", async () => {
        const store = createStore();
        const first = store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate(args));
        await first.unwrap();
        const second = store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate({ ...args, query: " ma " }));
        await second.unwrap(); expect(client).toHaveBeenCalledOnce();
        expect(client).toHaveBeenCalledWith(expect.objectContaining({ url: "/transactions/comment-suggestions", params: { type: "tag", query: "ma" } }));
        store.dispatch(auth.actions.change(2));
        await store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate({ ...args, userId: 2 })).unwrap();
        await store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate({ ...args, userId: 2, type: "ref" })).unwrap();
        expect(client).toHaveBeenCalledTimes(3);
        const obsolete = await store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate({ ...args, query: "new" }));
        expect(obsolete.isError).toBe(true); expect(client).toHaveBeenCalledTimes(3);
        first.unsubscribe(); second.unsubscribe(); store.dispatch(transactionsApi.util.resetApiState());
    });

    it("retains unused cache for sixty seconds and invalidates after successful transaction mutation", async () => {
        const store = createStore();
        const first = store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate(args)); await first.unwrap();
        await store.dispatch(transactionsApi.endpoints.createTransaction.initiate({ accountId: 1, categoryId: 1, amount: -2, comment: "#market", created: "2026-11-07" })).unwrap();
        await waitFor(() => expect(client).toHaveBeenCalledTimes(3));
        await waitFor(() => expect(transactionsApi.endpoints.getCommentSuggestions.select(args)(store.getState()).isSuccess).toBe(true));
        vi.useFakeTimers(); first.unsubscribe();
        await vi.advanceTimersByTimeAsync(59_999);
        expect(transactionsApi.endpoints.getCommentSuggestions.select(args)(store.getState()).data).toEqual({ suggestions: ["market"] });
        await vi.advanceTimersByTimeAsync(2);
        expect(transactionsApi.endpoints.getCommentSuggestions.select(args)(store.getState()).isUninitialized).toBe(true);
        store.dispatch(transactionsApi.util.resetApiState());
    });

    it("rejects responses completed after the authenticated identity changes", async () => {
        let resolve: ((value: { data: { suggestions: string[] } }) => void) | undefined;
        client.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        const store = createStore(); const request = store.dispatch(transactionsApi.endpoints.getCommentSuggestions.initiate(args));
        store.dispatch(auth.actions.change(2)); resolve?.({ data: { suggestions: ["private-old"] } });
        const result = await request;
        expect(result.isError).toBe(true); expect(result.data).toBeUndefined();
        request.unsubscribe(); store.dispatch(transactionsApi.util.resetApiState());
    });
});
