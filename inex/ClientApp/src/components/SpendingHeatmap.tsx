import React, { useEffect, useMemo, useState } from "react";
import { Alert, Spin } from "antd";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type {
  SpendingHeatmapDay,
  SpendingHeatmapResponse,
} from "../model/Report/SpendingHeatmap";
import apiClient from "../utils/apiClient";
import "./SpendingHeatmap.css";

interface SpendingHeatmapProps {
  start: Dayjs;
  end: Dayjs;
  height?: number;
  minWidth?: number;
  padding?: number;
  showRange?: boolean;
}

interface HeatmapPoint extends SpendingHeatmapDay {
  x: number;
  y: number;
  label: string;
}

interface CellShapeProps {
  cx?: number;
  cy?: number;
  payload?: HeatmapPoint;
}

interface HeatmapCellProps extends CellShapeProps {
  maxSpend: number;
}

const cellSize = 14;
const dayTicks = [0, 1, 2, 3, 4, 5, 6];
const spendingHeatmapColors = [
  "var(--bg-stripe)",
  "var(--expense-50)",
  "var(--expense-100)",
  "var(--expense-400)",
  "var(--expense-700)",
] as const;

export const getSpendingIntensityColor = (totalSpend: number, maxSpend: number) => {
  if (totalSpend <= 0 || maxSpend <= 0) return spendingHeatmapColors[0];
  const ratio = totalSpend / maxSpend;
  if (ratio >= 0.75) return spendingHeatmapColors[4];
  if (ratio >= 0.5) return spendingHeatmapColors[3];
  if (ratio >= 0.25) return spendingHeatmapColors[2];
  return spendingHeatmapColors[1];
};

const HeatmapCell = ({ cx = 0, cy = 0, payload, maxSpend }: HeatmapCellProps) => (
  <rect
    x={cx - cellSize / 2}
    y={cy - cellSize / 2}
    width={cellSize}
    height={cellSize}
    rx={2}
    ry={2}
    fill={getSpendingIntensityColor(payload?.totalSpend ?? 0, maxSpend)}
  />
);

const SpendingHeatmap = ({
  start,
  end,
  height = 180,
  minWidth = 760,
  padding = 20,
  showRange = true,
}: SpendingHeatmapProps) => {
  const { t, i18n } = useTranslation();
  const [report, setReport] = useState<SpendingHeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const startDate = start.format("YYYY-MM-DD");
  const endDate = end.format("YYYY-MM-DD");

  useEffect(() => {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    setIsLoading(true);
    setError(false);

    apiClient
      .get<SpendingHeatmapResponse>(`/reports/spending-heatmap?${params.toString()}`)
      .then(({ data }) => setReport(data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [endDate, startDate]);

  const chartData = useMemo<HeatmapPoint[]>(() => {
    if (!report) return [];
    const firstWeekStart = dayjs(report.metadata.start).startOf("week");

    return report.data.map(day => {
      const date = dayjs(day.date);
      return {
        ...day,
        x: date.startOf("week").diff(firstWeekStart, "week"),
        y: date.day(),
        label: date.format("D MMM YYYY"),
      };
    });
  }, [report]);

  const maxSpend = useMemo(
    () => Math.max(...chartData.map(day => day.totalSpend), 0),
    [chartData]
  );

  const maxWeek = useMemo(
    () => Math.max(...chartData.map(day => day.x), 0),
    [chartData]
  );

  const monthTicks = useMemo(() => {
    if (!report) return [];
    const firstWeekStart = dayjs(report.metadata.start).startOf("week");
    const startMonth = dayjs(report.metadata.start).startOf("month");
    const endMonth = dayjs(report.metadata.end).startOf("month");
    const ticks: number[] = [];

    for (let date = startMonth; date.isBefore(endMonth) || date.isSame(endMonth); date = date.add(1, "month")) {
      ticks.push(date.startOf("week").diff(firstWeekStart, "week"));
    }

    return Array.from(new Set(ticks));
  }, [report]);

  const currency = report?.metadata.currency ?? "USD";
  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: "currency", currency }),
    [currency, i18n.language]
  );
  const heatmapSummary = useMemo(() => {
    const totalSpend = chartData.reduce((sum, day) => sum + day.totalSpend, 0);
    const spendDays = chartData.filter(day => day.totalSpend > 0).length;
    const topDays = chartData
      .filter(day => day.totalSpend > 0)
      .slice()
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);

    return { totalSpend, spendDays, topDays };
  }, [chartData]);

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: HeatmapPoint }> }) => {
    if (!active || !payload?.length) return null;
    const day = payload[0].payload as HeatmapPoint | undefined;
    if (!day) return null;

    return (
      <div className="spending-heatmap-tooltip">
        <strong>{day.label}</strong>
        <span>
          {t("reports.heatmapTooltipSpend", {
            amount: amountFormatter.format(day.totalSpend),
          })}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="spending-heatmap-state" style={{ padding }}>
        <Spin />
        <span>{t("reports.heatmapLoading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding }}>
        <Alert type="error" message={t("reports.heatmapError")} />
      </div>
    );
  }

  if (!report || chartData.length === 0) {
    return (
      <div className="spending-heatmap-empty" style={{ padding }}>
        <strong>{t("reports.heatmapEmpty")}</strong>
      </div>
    );
  }

  return (
    <div className="spending-heatmap" style={{ padding }}>
      {showRange && (
        <p className="spending-heatmap__range">
          {t("reports.heatmapRange", {
            start: dayjs(report.metadata.start).format("D MMM YYYY"),
            end: dayjs(report.metadata.end).format("D MMM YYYY"),
          })}
        </p>
      )}

      <div className="spending-heatmap__chart-scroll" style={{ height }}>
        <div style={{ minWidth: Math.max(minWidth, (maxWeek + 1) * 18) }}>
          <ResponsiveContainer width="100%" height={height - 10}>
            <ScatterChart margin={{ top: 20, right: 16, bottom: 10, left: 16 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, maxWeek]}
                ticks={monthTicks}
                tickFormatter={value => dayjs(report.metadata.start).startOf("week").add(value, "week").format("MMM")}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={24}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 6]}
                ticks={dayTicks}
                tickFormatter={value => dayjs().day(value).format("dd")}
                axisLine={false}
                tickLine={false}
                width={28}
                reversed
              />
              <ZAxis range={[cellSize]} />
              <Tooltip content={renderTooltip} cursor={false} />
              <Scatter
                data={chartData}
                shape={(props: CellShapeProps) => <HeatmapCell {...props} maxSpend={maxSpend} />}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="spending-heatmap__legend" aria-label={t("reports.heatmapLegendCell")}>
        <span>{t("reports.heatmapLegendLess")}</span>
        {[0, 0.2, 0.4, 0.7, 1].map(step => (
          <span
            key={step}
            aria-hidden="true"
            className="spending-heatmap__legend-cell"
            style={{
              background: getSpendingIntensityColor(step * maxSpend, maxSpend),
            }}
          />
        ))}
        <span>{t("reports.heatmapLegendMore")}</span>
      </div>

      <section className="spending-heatmap__summary" aria-label={t("reports.heatmapSummaryTitle")}>
        <strong>{t("reports.heatmapSummaryTitle")}</strong>
        <p>
          {t("reports.heatmapSummaryTotals", {
            days: heatmapSummary.spendDays,
            total: amountFormatter.format(heatmapSummary.totalSpend),
          })}
        </p>
        {heatmapSummary.topDays.length > 0 && (
          <ul>
            {heatmapSummary.topDays.map(day => (
              <li key={day.date}>
                <span>{day.label}</span>
                <span>{amountFormatter.format(day.totalSpend)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SpendingHeatmap;
