import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { parseDashboardMonth, useDashboardMonth } from "./useDashboardMonth";

const Probe = ({ enabled = true }: { enabled?: boolean }) => {
    const month = useDashboardMonth(enabled);
    const location = useLocation();
    const navigate = useNavigate();
    return <>
        <output data-testid="month">{month.selectedMonth}</output>
        <output data-testid="range">{month.monthRange.map((date) => dayjs.unix(date).format("YYYY-MM-DD")).join("/")}</output>
        <output data-testid="url">{location.search}</output>
        <button onClick={() => month.selectMonth(dayjs(`${month.selectedMonth}-01`).subtract(1, "month"))}>Previous</button>
        <button onClick={() => month.selectMonth(dayjs(`${month.selectedMonth}-01`).add(1, "month"))}>Next</button>
        <button onClick={() => month.selectMonth(dayjs(`${month.currentMonth}-01`))}>Current</button>
        <button onClick={() => navigate(-1)}>Back</button>
    </>;
};
const open = (entry = "/dashboard", enabled = true) => render(<MemoryRouter initialEntries={[entry]}><Probe enabled={enabled} /></MemoryRouter>);

describe("visual dashboard month navigation", () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 0, 15, 12)); });
    afterEach(() => { vi.useRealTimers(); });

    it.each([null, "", "2025-13", "2025-00", "2025-1", "2025-01-01", "oops", "2026-02", "2026-01", "1969-12", "0000-01"])("rejects nonhistorical or malformed selection %s", (value) => {
        expect(parseDashboardMonth(value, "2026-01")).toBeNull();
    });

    it("switches across years, preserves unrelated parameters, restores Back and resets current mode", () => {
        open("/dashboard?keep=yes");
        expect(screen.getByTestId("month")).toHaveTextContent("2026-01");
        fireEvent.click(screen.getByText("Previous"));
        expect(screen.getByTestId("month")).toHaveTextContent("2025-12");
        expect(screen.getByTestId("url")).toHaveTextContent("?keep=yes&month=2025-12");
        fireEvent.click(screen.getByText("Previous"));
        fireEvent.click(screen.getByText("Back"));
        expect(screen.getByTestId("month")).toHaveTextContent("2025-12");
        fireEvent.click(screen.getByText("Current"));
        expect(screen.getByTestId("url")).toHaveTextContent("?keep=yes");
        fireEvent.click(screen.getByText("Next"));
        expect(screen.getByTestId("month")).toHaveTextContent("2026-01");
    });

    it("restores a URL month on remount and uses leap-year month boundaries", () => {
        const view = open("/dashboard?month=2024-02");
        expect(screen.getByTestId("range")).toHaveTextContent("2024-02-01/2024-02-29");
        view.unmount();
        open("/dashboard?month=2024-02");
        expect(screen.getByTestId("month")).toHaveTextContent("2024-02");
    });

    it.each(["2026-02", "2025-13", "2026-01", "1969-12"])("canonicalizes %s to current mode", (value) => {
        open(`/dashboard?keep=yes&month=${value}`);
        expect(screen.getByTestId("month")).toHaveTextContent("2026-01");
        expect(screen.getByTestId("url")).toHaveTextContent("?keep=yes");
    });

    it.each(["/dashboard", "/dashboard?month=2026-01"])("advances current mode at rollover for %s", (entry) => {
        vi.setSystemTime(new Date(2026, 0, 31, 23, 59, 59));
        open(entry);
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId("month")).toHaveTextContent("2026-02");
    });

    it("keeps explicit historical months fixed at rollover", () => {
        vi.setSystemTime(new Date(2026, 0, 31, 23, 59, 59));
        open("/dashboard?month=2025-12");
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId("month")).toHaveTextContent("2025-12");
    });

    it("ignores historical selection in classic mode without rewriting its URL", () => {
        open("/dashboard?month=2025-12", false);
        expect(screen.getByTestId("month")).toHaveTextContent("2026-01");
        expect(screen.getByTestId("url")).toHaveTextContent("?month=2025-12");
    });
});
