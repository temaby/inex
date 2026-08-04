import { describe, expect, it } from "vitest";

import { parseAxiosError } from "./parseAxiosError";

const t = (key: string): string => ({
    "errors.amount.not_zero": "Amount cannot be zero",
}[key] ?? key);

describe("parseAxiosError", () => {
    it("translates ProblemDetails validation errors returned by RTK Query", () => {
        expect(parseAxiosError(
            { status: 422, data: { errors: { amount: ["amount.not_zero"] } } },
            "Could not save transaction",
            t,
        )).toBe("Amount cannot be zero");
    });

    it("uses the fallback when an RTK Query error has no ProblemDetails payload", () => {
        expect(parseAxiosError({ status: 500, data: "unexpected" }, "Could not save transaction", t))
            .toBe("Could not save transaction");
    });
});
