import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestRatesForRange } from "../../store/rates/rates-action";
import { useCurrentBalanceRates } from "./useCurrentBalanceRates";
import type { ExchangeRateItem } from "../../store/rates/rates-slice";

vi.mock("../../store/rates/rates-action", () => ({ requestRatesForRange: vi.fn() }));
const request = vi.mocked(requestRatesForRange);
const rate: ExchangeRateItem = { id: 1, currencyFrom: "USD", currencyTo: "PLN", rate: 4, date: "2026-04-03", isTemporary: false };

describe("independently scoped current balance rates", () => {
    beforeEach(() => { request.mockReset(); });

    it("does not request rates until a historical view needs converted current balances", () => {
        const { result } = renderHook(() => useCurrentBalanceRates(false, "2026-04", 1, null, "USD"));
        expect(request).not.toHaveBeenCalled();
        expect(result.current.loading).toBe(false);
    });

    it("requests the current month in linked scope, finishes missing/error state and supports retry", async () => {
        request.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([rate]);
        const { result } = renderHook(() => useCurrentBalanceRates(true, "2026-04", 1, 2, "USD"));
        expect(request).toHaveBeenCalledWith("2026-04-01", "2026-04-30", 2);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.items).toEqual([]);
        act(() => result.current.retry());
        await waitFor(() => expect(result.current.items).toEqual([rate]));
    });

    it("ignores late results after switching workspace A to B to A", async () => {
        let finishOld: (value: ExchangeRateItem[]) => void = () => undefined;
        let finishLatest: (value: ExchangeRateItem[]) => void = () => undefined;
        request.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
            .mockResolvedValueOnce([{ ...rate, rate: 5 }])
            .mockImplementationOnce(() => new Promise((resolve) => { finishLatest = resolve; }));
        const { result, rerender } = renderHook(({ scope }) => useCurrentBalanceRates(true, "2026-04", 1, scope, "USD"), { initialProps: { scope: 2 } });
        rerender({ scope: 3 });
        await waitFor(() => expect(result.current.items[0]?.rate).toBe(5));
        rerender({ scope: 2 });
        expect(result.current.loading).toBe(true);
        await act(async () => { finishOld([rate]); });
        expect(result.current.items).toEqual([]);
        expect(result.current.loading).toBe(true);
        await act(async () => { finishLatest([{ ...rate, rate: 6 }]); });
        expect(result.current.items[0]?.rate).toBe(6);
    });
});
