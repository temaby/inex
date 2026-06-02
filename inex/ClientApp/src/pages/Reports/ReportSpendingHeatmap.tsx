import React, { useMemo } from "react";
import dayjs from "dayjs";
import SpendingHeatmap from "../../components/SpendingHeatmap";

const ReportSpendingHeatmap = () => {
  const dateRange = useMemo(() => {
    const end = dayjs().startOf("day");
    return {
      start: end.subtract(12, "month"),
      end,
    };
  }, []);

  return <SpendingHeatmap start={dateRange.start} end={dateRange.end} />;
};

export default ReportSpendingHeatmap;
