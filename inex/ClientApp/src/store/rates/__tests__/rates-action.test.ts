import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../../../utils/apiClient";
import store from "../../index";
import ratesSlice, { ratesActions } from "../rates-slice";
import { fetchCachedRatesForRange, fetchRatesForRange } from "../rates-action";

vi.mock("../../../utils/apiClient", () => ({ default: { get: vi.fn() } }));
const get = vi.mocked(apiClient.get);
const start = "2026-08-01";
const end = "2026-10-31";
const key = `self:${start}:${end}`;
const rate = { id: 1, currencyFrom: "USD", currencyTo: "EUR", date: start, rate: 0.9, isTemporary: false };
const createStore = () => configureStore({ reducer: (state: ReturnType<typeof store.getState> = store.getState(), action) => ({ ...state, rates: ratesSlice.reducer(state.rates, action) }) });

describe("on-demand rate ranges", () => {
  beforeEach(() => { get.mockReset(); });

  it("loads own long ranges even after cache-only completion, without changing cached consumers", async () => {
    const store = createStore();
    get.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: [rate] } });
    await store.dispatch(fetchCachedRatesForRange(start, end));
    await store.dispatch(fetchRatesForRange(start, end));
    expect(get.mock.calls.map(call => call[0])).toEqual(["/exchange/rates/cached", "/exchange/rates/range"]);
    expect(get).toHaveBeenLastCalledWith("/exchange/rates/range", { params: { startDate: start, endDate: end, linkedUserId: undefined } });
    expect(store.getState().rates.range).toMatchObject({ completedKey: key, items: [rate], loading: false });
    expect(store.getState().rates.cached?.items).toEqual([]);
  });

  it("keeps linked requests cache-only, including on failure", async () => {
    const store = createStore();
    get.mockRejectedValue({ data: { title: "unavailable" } });
    await store.dispatch(fetchRatesForRange(start, end, 2));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/exchange/rates/cached", { params: { startDate: start, endDate: end, linkedUserId: 2 } });
    expect(store.getState().rates.range).toMatchObject({ completedKey: `2:${start}:${end}`, loading: false, error: expect.any(String) });
  });

  it("retains useful cache after synchronization failure", async () => {
    const store = createStore();
    get.mockRejectedValueOnce(new Error("provider unavailable")).mockResolvedValueOnce({ data: { data: [rate] } });
    await store.dispatch(fetchRatesForRange(start, end));
    expect(get.mock.calls.map(call => call[0])).toEqual(["/exchange/rates/range", "/exchange/rates/cached"]);
    expect(store.getState().rates.range).toMatchObject({ completedKey: key, loading: false, items: [rate], error: null });
  });

  it("finishes terminal failures and allows an explicit retry", async () => {
    const store = createStore();
    get.mockRejectedValue(new Error("offline"));
    await store.dispatch(fetchRatesForRange(start, end));
    expect(store.getState().rates.range).toMatchObject({ completedKey: key, loading: false, error: expect.any(String) });
    get.mockResolvedValue({ data: { data: [rate] } });
    await store.dispatch(fetchRatesForRange(start, end));
    expect(store.getState().rates.range).toMatchObject({ items: [rate], error: null });
  });

  it("deduplicates effects while pending and ignores obsolete scope results", async () => {
    const store = createStore();
    let finish: (value: unknown) => void = () => undefined;
    get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = store.dispatch(fetchRatesForRange(start, end));
    await store.dispatch(fetchRatesForRange(start, end));
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValueOnce({ data: { data: [] } });
    await store.dispatch(fetchRatesForRange(start, end, 2));
    finish({ data: { data: [rate] } });
    await pending;
    expect(store.getState().rates.range).toMatchObject({ completedKey: `2:${start}:${end}`, items: [], loading: false });
  });

  it.each(["success", "failure"])("ignores an older A %s after switching A to B to A", async (outcome) => {
    const store = createStore();
    let finishOld: (value: unknown) => void = () => undefined;
    let rejectOld: (error: Error) => void = () => undefined;
    let finishLatest: (value: unknown) => void = () => undefined;
    get.mockImplementationOnce(() => new Promise((resolve, reject) => { finishOld = resolve; rejectOld = reject; }));
    const old = store.dispatch(fetchRatesForRange(start, end, 2));
    get.mockResolvedValueOnce({ data: { data: [] } });
    await store.dispatch(fetchRatesForRange(start, end, 3));
    get.mockImplementationOnce(() => new Promise(resolve => { finishLatest = resolve; }));
    const latest = store.dispatch(fetchRatesForRange(start, end, 2));
    const requestId = store.getState().rates.range?.requestId;
    if (outcome === "success") finishOld({ data: { data: [rate] } });
    else rejectOld(new Error("obsolete failure"));
    await old;
    expect(store.getState().rates.range).toMatchObject({ requestId, requestKey: `2:${start}:${end}`, items: [], loading: true, error: null });
    finishLatest({ data: { data: [{ ...rate, rate: 0.95 }] } });
    await latest;
    expect(store.getState().rates.range).toMatchObject({ requestId, items: [{ ...rate, rate: 0.95 }], loading: false, error: null });
  });

  it("ignores an obsolete failure after a period change", () => {
    const store = createStore();
    store.dispatch(ratesActions.beginRangeRates({ key, requestId: "old" }));
    store.dispatch(ratesActions.beginRangeRates({ key: "new-period", requestId: "new" }));
    store.dispatch(ratesActions.setRangeRatesError({ key, requestId: "old", error: "stale" }));
    expect(store.getState().rates.range).toMatchObject({ requestKey: "new-period", loading: true, error: null });
  });
});
