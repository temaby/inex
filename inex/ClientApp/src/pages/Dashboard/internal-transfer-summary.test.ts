import { describe, expect, it } from "vitest";
import { convertInternalTransferSummary } from "./internal-transfer-summary";

describe("internal-transfer reporting conversion", () => {
    it("converts each currency/date once and leaves reporting-currency amounts unchanged", () => {
        const result = convertInternalTransferSummary([
            { date: "2024-02-01", currency: "PLN", amountReceived: 800, amountSent: 400, recordCount: 2 },
            { date: "2024-02-02", currency: "PLN", amountReceived: 500, amountSent: 1000, recordCount: 2 },
            { date: "2024-02-02", currency: "USD", amountReceived: 50, amountSent: 20, recordCount: 2 },
        ], "USD", [
            { date: "2024-02-01", currencyFrom: "USD", currencyTo: "PLN", rate: 4 },
            { date: "2024-02-02", currencyFrom: "USD", currencyTo: "PLN", rate: 5 },
        ]);
        expect(result).toEqual({ amountReceived: 350, amountSent: 320, netChange: 30, recordCount: 6, isComplete: true, warnings: [] });
    });

    it("marks totals incomplete when any dated transfer rate is unavailable", () => {
        const result = convertInternalTransferSummary([
            { date: "2024-02-01", currency: "USD", amountReceived: 100, amountSent: 0, recordCount: 1 },
            { date: "2024-02-02", currency: "PLN", amountReceived: 0, amountSent: 400, recordCount: 1 },
        ], "USD", [{ date: "2024-02-01", currencyFrom: "USD", currencyTo: "PLN", rate: 4 }]);
        expect(result.isComplete).toBe(false);
        expect(result.warnings).toEqual([{ currency: "PLN", date: "2024-02-02" }]);
        expect(result.recordCount).toBe(2);
    });

    it.each([
        [500, 0, 500], [0, 500, -500], [500, 200, 300], [200, 500, -300], [500, 500, 0],
    ])("preserves direction magnitudes received=%s sent=%s", (amountReceived, amountSent, netChange) => {
        expect(convertInternalTransferSummary([
            { date: "2024-02-01", currency: "USD", amountReceived, amountSent, recordCount: 2 },
        ], "USD", [])).toMatchObject({ amountReceived, amountSent, netChange, recordCount: 2, isComplete: true });
    });

    it("has no activity for an empty posting list", () => {
        expect(convertInternalTransferSummary([], "USD", [])).toMatchObject({ recordCount: 0, amountReceived: 0, amountSent: 0, netChange: 0, isComplete: true });
    });
});
