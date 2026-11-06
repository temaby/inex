// Dashboard summaries keep cents only when whole-unit rounding would hide a small amount.
export const dashboardFractionDigits = (value: number): 0 | 2 =>
    value !== 0 && Math.abs(value) < 1 ? 2 : 0;

export const displayedDashboardAmount = (value: number): number => Number(
    new Intl.NumberFormat("en", {
        useGrouping: false,
        maximumFractionDigits: dashboardFractionDigits(value),
    }).format(value),
);

export const formatDashboardMoney = (value: number, locale: string, currency: string): string => {
    const fractionDigits = dashboardFractionDigits(value);
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value);
};
