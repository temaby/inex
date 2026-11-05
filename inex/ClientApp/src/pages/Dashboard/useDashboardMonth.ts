import { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
import { getTransactionMonthRange } from "../Transactions/transaction-ledger-utils";

// Transaction filters use nonpositive timestamps as the no-date-filter sentinel.
export const isSupportedDashboardMonth = (month: Dayjs) => month.isValid() && getTransactionMonthRange(month)[0] > 0;

export const parseDashboardMonth = (value: string | null, currentMonth: string): string | null => {
    if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const month = dayjs(`${value}-01`);
    return isSupportedDashboardMonth(month) && month.format("YYYY-MM") === value && value < currentMonth ? value : null;
};

export const useDashboardMonth = (enabled: boolean) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentMonth, setCurrentMonth] = useState(() => dayjs().format("YYYY-MM"));
    const requestedMonth = searchParams.get("month");
    const historicalMonth = enabled ? parseDashboardMonth(requestedMonth, currentMonth) : null;
    const selectedMonth = historicalMonth ?? currentMonth;

    useEffect(() => {
        let timeoutId: number;
        const schedule = () => {
            const delay = Math.min(Math.max(dayjs().add(1, "month").startOf("month").diff(dayjs()) + 1000, 1000), 86400000);
            timeoutId = window.setTimeout(() => {
                setCurrentMonth(dayjs().format("YYYY-MM"));
                schedule();
            }, delay);
        };
        schedule();
        return () => window.clearTimeout(timeoutId);
    }, []);

    // Canonical current mode keeps following calendar rollover, including an explicit current URL.
    useEffect(() => {
        if (enabled && requestedMonth !== null && !historicalMonth) {
            const next = new URLSearchParams(searchParams);
            next.delete("month");
            setSearchParams(next, { replace: true });
        }
    }, [enabled, historicalMonth, requestedMonth, searchParams, setSearchParams]);

    const selectMonth = (month: Dayjs | null) => {
        if (!month || !isSupportedDashboardMonth(month)) return;
        const value = month.format("YYYY-MM");
        if (value > currentMonth) return;
        const next = new URLSearchParams(searchParams);
        if (value === currentMonth) next.delete("month");
        else next.set("month", value);
        setSearchParams(next);
    };

    return {
        monthRange: useMemo(() => getTransactionMonthRange(`${selectedMonth}-01`), [selectedMonth]),
        currentMonth,
        selectedMonth,
        isHistoricalMonth: historicalMonth !== null,
        selectMonth,
    };
};
