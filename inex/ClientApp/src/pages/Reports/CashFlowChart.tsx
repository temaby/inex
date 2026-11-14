import { useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Customized, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { HistoryReportItem } from "../../store/report/report-api";
import { createFixedAmountFormatter } from "../../utils/formatAmount";

const series = ["income", "expense", "savings"] as const;
export type CashFlowSeries = typeof series[number];
type CashFlowMonth = HistoryReportItem & { shortMonth: string; longMonth: string };
type VisibleSeries = Record<CashFlowSeries, boolean>;

const chartMargin = { top: 38, right: 8, bottom: 38, left: 4 };
const barColors = { income: "var(--income-200)", expense: "var(--expense-200)" };
const legendLabels = { income: "reports.income", expense: "reports.expenses", savings: "reports.netCashFlow" };
const dot = { r: 3, strokeWidth: 1.5, stroke: "var(--bg-surface)", fill: "var(--brand-ink)" };
const labelCharacterWidth = 7.5; // 12px monospace text, including signs and separators.
const barLabelGap = 12;

interface ChartGeometry {
  height?: number;
  xAxisMap?: Record<string, { scale: ((value: number) => number) & { bandwidth: () => number } }>;
  yAxisMap?: Record<string, { scale: (value: number) => number }>;
  offset?: { top: number; height: number };
}

function MonthHighlight({ xAxisMap, offset, month }: ChartGeometry & { month?: number }) {
  const xScale = xAxisMap?.[0]?.scale;
  if (!xScale || !offset || month === undefined) return null;
  return <rect className="cash-flow-chart__highlight" x={xScale(month) + 3} y={offset.top}
    width={Math.max(0, xScale.bandwidth() - 6)} height={offset.height} rx={4} pointerEvents="none" />;
}

interface ValueLabelsProps extends ChartGeometry {
  history: CashFlowMonth[];
  visible: VisibleSeries;
  formatValue: (value: number, signed?: boolean) => string;
}

function ValueLabels({ xAxisMap, yAxisMap, height, history, visible, formatValue }: ValueLabelsProps) {
  const xScale = xAxisMap?.[0]?.scale;
  const yScale = yAxisMap?.[0]?.scale;
  if (!xScale || !yScale || !height) return null;

  const baseline = yScale(0);
  return (
    <g className="cash-flow-chart__values" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
      {history.map((month) => {
        const x = xScale(month.month) + xScale.bandwidth() / 2;
        const incomePoint = yScale(month.income);
        const expensePoint = yScale(month.expense);
        const incomeY = incomePoint - barLabelGap;
        const expenseY = expensePoint + barLabelGap;
        const netPoint = yScale(month.savings);
        const direction = month.savings < 0 ? 1 : -1;
        const netPositions = [20, -20, 38, -38, 56, -56, 74, -74, 92, -92]
          .map((distance) => netPoint + distance * direction);
        const clearPositions = netPositions.filter((y) =>
          y >= 9 && y <= height - 9 &&
          (!visible.income || Math.abs(y - incomeY) >= 18) && (!visible.expense || Math.abs(y - expenseY) >= 18)
        );
        const awayFromBaseline = clearPositions.filter((y) => Math.abs(y - baseline) >= 10);
        // When the marker sits on a bar end, keep its label outside that bar if there is room.
        const nearIncomeEnd = visible.income && incomePoint < baseline && Math.abs(netPoint - incomePoint) < barLabelGap;
        const nearExpenseEnd = visible.expense && expensePoint > baseline && Math.abs(netPoint - expensePoint) < barLabelGap;
        const outsideBar = awayFromBaseline.find((y) =>
          (nearIncomeEnd && y < incomeY) || (nearExpenseEnd && y > expenseY)
        );
        const netY = outsideBar ?? awayFromBaseline[0] ?? clearPositions[0] ?? netPoint;
        const netLabel = formatValue(month.savings, true);
        const netLabelWidth = netLabel.length * labelCharacterWidth + 4;
        const netTone = netLabel.startsWith("+") ? "income" : netLabel.startsWith("−") ? "expense" : "neutral";
        return (
          <g key={month.month}>
            {visible.income && (
              <text data-series="income" data-tone="income" x={x} y={incomeY}>{formatValue(month.income)}</text>
            )}
            {visible.expense && (
              <text data-series="expense" data-tone="expense" x={x} y={expenseY}>{formatValue(month.expense)}</text>
            )}
            {visible.savings && (
              <g>
                <rect className="cash-flow-chart__net-label-bg" x={x - netLabelWidth / 2} y={netY - 8}
                  width={netLabelWidth} height={16} rx={2} />
                <text data-series="savings" data-tone={netTone} x={x} y={netY}>{netLabel}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface CashFlowChartProps {
  history: CashFlowMonth[];
  lastChartMonth: number;
  locale: string;
  isLoading: boolean;
  currency: string;
  formatMetric: (value: number, key: CashFlowSeries) => { amount: string; tone: string };
  getMonthPath: (month: number) => string;
  onOpenMonth: (month: number) => void;
}

export default function CashFlowChart({ history, lastChartMonth, locale, isLoading, currency, formatMetric, getMonthPath, onOpenMonth }: CashFlowChartProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<VisibleSeries>({ income: true, expense: true, savings: true });
  const [hoveredIndex, setHoveredIndex] = useState<number>();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [detailFocused, setDetailFocused] = useState(false);
  const detailPanel = useRef<HTMLDivElement>(null);
  const detailLink = useRef<HTMLAnchorElement>(null);
  const selectedMonth = history[selectedIndex ?? -1];
  const inspectedMonth = detailFocused ? selectedMonth : history[hoveredIndex ?? selectedIndex ?? -1];
  const highlightedMonth = (selectedMonth ?? inspectedMonth)?.month;
  const whole = useMemo(() => createFixedAmountFormatter(locale, 0), [locale]);
  const fractional = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const formatValue = (value: number, signed = false) => {
    const magnitude = Math.abs(value);
    const amount = (magnitude < 10 ? fractional : whole).format(magnitude);
    const sign = magnitude < 0.05 ? "" : value < 0 ? "−" : signed ? "+" : "";
    return `${sign}${amount}`;
  };
  const chartData = useMemo(() => history.map((month) => month.month <= lastChartMonth
    ? month
    : { ...month, income: null, expense: null, savings: null }), [history, lastChartMonth]);
  const elapsedMonths = history.filter((month) => month.month <= lastChartMonth);
  const visibleSeries = series.filter((key) => visible[key]);
  const visibleValues = elapsedMonths.flatMap((month) => visibleSeries.map((key) => month[key]));
  const labelWidths = elapsedMonths.flatMap((month) => visibleSeries.map((key) =>
    formatValue(month[key], key === "savings").length * labelCharacterWidth
  ));
  const monthWidth = Math.max(58, Math.ceil(Math.max(0, ...labelWidths)) + 12);
  const min = Math.min(0, ...visibleValues);
  const max = Math.max(0, ...visibleValues);
  const padding = Math.max((max - min) * 0.06, max === min ? 1 : 0.25);
  const domain: [number, number] = [min - padding, max + padding];
  const roughStep = (domain[1] - domain[0]) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const tickStep = magnitude * ([1, 2, 5].find((step) => step >= roughStep / magnitude) ?? 10);
  const firstTick = Math.ceil(domain[0] / tickStep);
  const ticks = Array.from({ length: Math.floor(domain[1] / tickStep) - firstTick + 1 }, (_, index) => (firstTick + index) * tickStep);
  const yAxisWidth = Math.max(40, ...ticks.map((tick) => formatValue(tick).length * labelCharacterWidth + 8));
  const canDrillFromMark = (event: MouseEvent) => {
    const { pointerType } = event.nativeEvent as PointerEvent;
    return pointerType ? pointerType !== "touch" : !window.matchMedia("(pointer: coarse)").matches;
  };
  const inspectMonth = (index: number, focusLink = false) => {
    setHoveredIndex(undefined);
    setSelectedIndex(index);
    requestAnimationFrame(() => {
      if (focusLink) detailLink.current?.focus();
      if (window.matchMedia("(max-width: 768px)").matches) {
        detailPanel.current?.scrollIntoView({ block: "nearest" });
      }
    });
  };

  return (
    <section className="report-panel cash-flow-chart" aria-label={t("reports.monthlyCashFlow")} aria-busy={isLoading}>
      <div className="cash-flow-chart__header">
        <div className="cash-flow-chart__legend" role="group" aria-label={t("reports.chartSeries")}>
          {series.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={visible[key]}
              onClick={() => setVisible((previous) => ({ ...previous, [key]: !previous[key] }))}
            >
              <span className="cash-flow-chart__swatch" data-series={key} aria-hidden="true" />
              {t(legendLabels[key])}
            </button>
          ))}
        </div>
        <span className="cash-flow-chart__currency">{t("reports.chartCurrency", { currency })}</span>
      </div>
      {history.length > 0 && (
        <>
          <p className="cash-flow-chart__scroll-hint">{t("reports.scrollMonths")} <span aria-hidden="true">→</span></p>
          <div className="cash-flow-chart__scroll">
            <div
              className="cash-flow-chart__canvas"
              style={{ "--month-count": history.length, "--month-width": `${monthWidth}px`, "--plot-start": `${chartMargin.left + yAxisWidth}px`, "--plot-end": `${chartMargin.right}px` } as CSSProperties}
              onMouseLeave={() => setHoveredIndex(undefined)}
            >
              <div className="cash-flow-chart__plot" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={chartMargin}
                    stackOffset="sign"
                    onMouseMove={({ activeTooltipIndex }) => setHoveredIndex(activeTooltipIndex === -1 ? undefined : activeTooltipIndex)}
                    onClick={({ activeTooltipIndex }, event: MouseEvent) => {
                      const month = history[activeTooltipIndex ?? -1];
                      if (!month || activeTooltipIndex === undefined) return;
                      const target = event.target;
                      if (target instanceof Element && target.closest(".recharts-bar-rectangle") && canDrillFromMark(event)) {
                        onOpenMonth(month.month);
                      } else {
                        inspectMonth(activeTooltipIndex);
                      }
                    }}
                  >
                    <Customized component={<MonthHighlight month={highlightedMonth} />} />
                    <CartesianGrid stroke="var(--border-1)" strokeOpacity={0.65} vertical={false} syncWithTicks />
                    <XAxis dataKey="month" scale="band" hide />
                    <YAxis
                      width={yAxisWidth}
                      domain={domain}
                      ticks={ticks}
                      interval={0}
                      tickFormatter={(value) => formatValue(value)}
                      tick={{ fill: "var(--fg-3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={6}
                    />
                    {(["income", "expense"] as const).map((key) => visible[key] && (
                      <Bar key={key} dataKey={key} stackId="cash-flow" barSize={28} fill={barColors[key]} isAnimationActive={false} />
                    ))}
                    <ReferenceLine y={0} stroke="var(--border-strong)" strokeWidth={1.5} />
                    {visible.savings && (
                      <Line type="linear" dataKey="savings" stroke="var(--brand-ink)" strokeWidth={2}
                        dot={dot} connectNulls={false} isAnimationActive={false} />
                    )}
                    <Customized component={<ValueLabels history={elapsedMonths} visible={visible} formatValue={formatValue} />} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="cash-flow-chart__months">
                {history.map((month, index) => (
                  <button
                    key={month.month}
                    type="button"
                    aria-label={month.longMonth}
                    aria-pressed={selectedIndex === index}
                    data-active={inspectedMonth?.month === month.month}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onClick={(event) => inspectMonth(index, event.detail === 0)}
                  >
                    {month.shortMonth}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {inspectedMonth && (
            <div className="cash-flow-chart__detail" ref={detailPanel}>
              <strong>{inspectedMonth.longMonth}</strong>
              {inspectedMonth.month > lastChartMonth ? (
                <p className="cash-flow-chart__pending">{t("reports.upcomingMonth")}</p>
              ) : (
                <dl>
                  {series.map((key) => {
                    const { amount, tone } = formatMetric(inspectedMonth[key], key);
                    return (
                      <div key={key}>
                        <dt>{t(legendLabels[key])}</dt>
                        <dd data-tone={tone}>{amount} <small>{currency}</small></dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {selectedMonth?.month === inspectedMonth.month && (
                <Link
                  ref={detailLink}
                  to={getMonthPath(selectedMonth.month)}
                  onFocus={() => setDetailFocused(true)}
                  onBlur={() => setDetailFocused(false)}
                >
                  {t("reports.categoryReport")}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
