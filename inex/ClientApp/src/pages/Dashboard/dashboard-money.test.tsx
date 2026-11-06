import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Num } from "../../components/primitives/Num";
import { dashboardFractionDigits, displayedDashboardAmount, formatDashboardMoney } from "./dashboard-money";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("dashboard monetary presentation", () => {
    it.each([
        [12458.37, 12458], [12458.68, 12459], [-12458.5, -12459],
        [0, 0], [0.42, 0.42], [-0.42, -0.42], [0.995, 1],
    ])("uses the same numeric rounding as the visible summary for %s", (value, expected) => {
        expect(displayedDashboardAmount(value)).toBe(expected);
    });

    it.each([
        ["en", 12458.68, "12,459 USD"], ["en", -12458.5, "-12,459 USD"],
        ["en", 0.42, "0.42 USD"], ["en", -0.42, "-0.42 USD"], ["en", 0, "0 USD"],
        ["ru", 12458.68, "12 459 USD"], ["ru", -0.42, "-0,42 USD"],
    ])("renders %s summary %s with locale, signs and adaptive precision", (locale, value, visible) => {
        render(<Num value={value} currency="USD" locale={locale} signage="negative-only" fractionDigits={dashboardFractionDigits(value)} />);
        expect(screen.getByRole("text")).toHaveTextContent(visible);
    });

    it("formats result amounts with the same precision while preserving full detail defaults", () => {
        expect(formatDashboardMoney(12458.68, "en", "USD")).toBe("$12,459");
        expect(formatDashboardMoney(0.42, "en", "USD")).toBe("$0.42");
        expect(formatDashboardMoney(-0.42, "ru", "USD").replace(/\s/g, " ")).toBe("-0,42 $");
        render(<Num value={12458.68} currency="USD" locale="en" signage="negative-only" />);
        expect(screen.getByRole("text")).toHaveTextContent("12,458.68 USD");
    });
});
