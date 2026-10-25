import dayjs from "dayjs";

export const getVisualDashboardFlowTitleKey = (periodStart?: string, referenceDate = new Date()) => {
    const currentMonth = dayjs(referenceDate).startOf("month");
    const periodMonth = periodStart ? dayjs(periodStart).startOf("month") : currentMonth;
    if (periodMonth.isBefore(currentMonth)) return "dashboard.visual.flowTitlePast";
    if (periodMonth.isAfter(currentMonth)) return "dashboard.visual.flowTitleFuture";
    return "dashboard.visual.flowTitle";
};
