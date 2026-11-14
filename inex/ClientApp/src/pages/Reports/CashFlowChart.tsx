import { useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Customized, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { HistoryReportItem } from "../../store/report/report-api";

const series = ["income", "expense", "savings"] as const;
export type CashFlowSeries = typeof series[number];
type CashFlowMonth = HistoryReportItem & { shortMonth: string; longMonth: string };
type VisibleSeries = Record<CashFlowSeries, boolean>;

const chartMargin = { top: 28, right: 8, bottom: 26, left: 4 };
const barColors = { income: "var(--income-200)", expense: "var(--expense-200)" };
const legendLabels = { income: "reports.income", expense: "reports.expenses", savings: "reports.netCashFlow" };
const dot = { r: 3, strokeWidth: 1.5, stroke: "var(--bg-surface)", fill: "var(--brand-ink)" };

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
  formatCompact: (value: number) => string;
}

function ValueLabels({ xAxisMap, yAxisMap, height, history, visible, formatCompact }: ValueLabelsProps) {
  const xScale = xAxisMap?.[0]?.scale;
  const yScale = yAxisMap?.[0]?.scale;
  if (!xScale || !yScale || !height) return null;

  return (
    <g className="cash-flow-chart__values" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
      {history.map((month) => {
        const x = xScale(month.month) + xScale.bandwidth() / 2;
        const incomePoint = yScale(month.income);
        const expensePoint = yScale(month.expense);
        const incomeY = incomePoint - 12;
        const expenseY = expensePoint + 12;
        const netPoint = yScale(month.savings);
        const direction = month.savings < 0 ? 1 : -1;
        // Keep the labels outside their bars and shift the net label when the values converge.
        const netPositions = [13, -13, 31, -31, 47, -47].map((distance) => netPoint + distance * direction).filter((y) =>
          y >= 9 && y <= height - 9 &&
          (!visible.income || Math.abs(y - incomeY) >= 17) && (!visible.expense || Math.abs(y - expenseY) >= 17)
        );
        const netY = netPositions.find((y) =>
          (!visible.income || Math.abs(y - incomePoint) >= 8) && (!visible.expense || Math.abs(y - expensePoint) >= 8)
        ) ?? netPositions[0] ?? netPoint;
        const labelY = { income: incomeY, expense: expenseY, savings: netY };
        const tone = { income: "income", expense: "expense", savings: month.savings > 0 ? "income" : month.savings < 0 ? "expense" : "neutral" };
        return (
          <g key={month.month}>
            {series.filter((key) => visible[key]).map((key) => (
              <text key={key} data-series={key} data-tone={tone[key]} x={x} y={labelY[key]}>
                {formatCompact(month[key])}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}

interface CashFlowChartProps {
  history: CashFlowMonth[];
  locale: string;
  isLoading: boolean;
  currency: string;
  formatMetric: (value: number, key: CashFlowSeries) => { amount: string; tone: string };
  getMonthPath: (month: number) => string;
  onOpenMonth: (month: number) => void;
}

export default function CashFlowChart({ history, locale, isLoading, currency, formatMetric, getMonthPath, onOpenMonth }: CashFlowChartProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<VisibleSeries>({ income: true, expense: true, savings: true });
  const [hoveredIndex, setHoveredIndex] = useState<number>();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [detailFocused, setDetailFocused] = useState(false);
  const detailPanel = useRef<HTMLDivElement>(null);
  const detailLink = useRef<HTMLAnchorElement>(null);
  const selectedMonth = history[selectedIndex ?? -1];
  const inspectedMonth = detailFocused ? selectedMonth : history[hoveredIndex ?? selectedIndex ?? -1];
  const compact = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale]);
  const compactWhole = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 0 }), [locale]);
  const fractional = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }), [locale]);
  const scientific = useMemo(() => new Intl.NumberFormat(locale, { notation: "scientific", maximumFractionDigits: 1 }), [locale]);
  const formatCompact = (value: number) => {
    const magnitude = Math.abs(value);
    if (magnitude >= 1) {
      const label = compact.format(value);
      if (label.length <= 9) return label;
      const wholeLabel = compactWhole.format(value);
      return wholeLabel.length <= 9 ? wholeLabel : scientific.format(value);
    }
    if (magnitude > 0 && magnitude < 0.001) return scientific.format(value);
    return fractional.format(value || 0);
  };
  const visibleValues = history.flatMap((month) => series.filter((key) => visible[key]).map((key) => month[key]));
  const min = Math.min(0, ...visibleValues);
  const max = Math.max(0, ...visibleValues);
  const padding = (max - min) * 0.06 || 1;
  const domain: [number, number] = [min - padding, max + padding];
  const roughStep = (domain[1] - domain[0]) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const tickStep = magnitude * ([1, 2, 5].find((step) => step >= roughStep / magnitude) ?? 10);
  const firstTick = Math.ceil(domain[0] / tickStep);
  const ticks = Array.from({ length: Math.floor(domain[1] / tickStep) - firstTick + 1 }, (_, index) => (firstTick + index) * tickStep);
  const fractionalTicks = new Intl.NumberFormat(locale, {
    notation: tickStep < 0.0001 ? "scientific" : "standard",
    maximumFractionDigits: Math.max(0, Math.min(4, -Math.floor(Math.log10(tickStep)))),
  });
  const formatTick = tickStep < 1 ? fractionalTicks.format : formatCompact;
  const yAxisWidth = Math.max(40, ...ticks.map((tick) => formatTick(tick).length * 6 + 6));
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
      {history.length > 0 && (
        <>
          <p className="cash-flow-chart__scroll-hint">{t("reports.scrollMonths")} <span aria-hidden="true">→</span></p>
          <div className="cash-flow-chart__scroll">
            <div
              className="cash-flow-chart__canvas"
              style={{ "--month-count": history.length, "--plot-start": `${chartMargin.left + yAxisWidth}px`, "--plot-end": `${chartMargin.right}px` } as CSSProperties}
              onMouseLeave={() => setHoveredIndex(undefined)}
            >
              <div className="cash-flow-chart__plot" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={history}
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
                    <Customized component={<MonthHighlight month={(selectedMonth ?? inspectedMonth)?.month} />} />
                    <CartesianGrid stroke="var(--border-1)" vertical={false} />
                    <XAxis dataKey="month" scale="band" hide />
                    <YAxis
                      width={yAxisWidth}
                      domain={domain}
                      ticks={ticks}
                      interval={0}
                      tickFormatter={formatTick}
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
                      <Line type="linear" dataKey="savings" stroke="var(--brand-ink)" strokeWidth={2} dot={dot} isAnimationActive={false} />
                    )}
                    <Customized component={<ValueLabels history={history} visible={visible} formatCompact={formatCompact} />} />
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
