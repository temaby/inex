import React, { useMemo } from "react";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import SpendingHeatmap, { getSpendingIntensityColor } from "../../components/SpendingHeatmap";

export { getSpendingIntensityColor };

const ReportSpendingHeatmap = () => {
  const location = useLocation();
  const interval = new URLSearchParams(location.search).get("interval");

  const dateRange = useMemo(() => {
    const selectedMonth = interval ? dayjs(interval, "YYYY-MM") : null;
    const end = selectedMonth?.isValid() ? selectedMonth.endOf("month") : dayjs().startOf("day");

    return {
      start: selectedMonth?.isValid() ? selectedMonth.startOf("month") : end.subtract(12, "month"),
      end,
    };
  }, [interval]);

  return <SpendingHeatmap start={dateRange.start} end={dateRange.end} />;
};

export default ReportSpendingHeatmap;
