import React, { useEffect, useMemo, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Banknote } from "lucide-react";
import { Num } from "../../components/primitives";
import { useGetHistoryReportQuery } from "../../store/report/report-api";
import type { HistoryReportItem } from "../../store/report/report-api";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import "./reports.css";

interface LabelProps {
  x?: number | string;
  y?: number | string;
  value?: number | string;
}

const ReportMonthlyHistory = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedYear = Number(new URLSearchParams(location.search).get("year"));
  const [year, setYear] = useState(Number.isFinite(requestedYear) && requestedYear > 0 ? requestedYear : dayjs().year());
  const currency = "USD";
  const { data: historyResponse, isLoading } = useGetHistoryReportQuery({ year, currency });
  const history = historyResponse?.data ?? [];

  const handleYearChange = (date: Dayjs | null) => {
    if (date) {
      setYear(date.year());
      navigate(`/reports/history?year=${date.year()}`, { replace: false });
    }
  };

  useEffect(() => {
    if (Number.isFinite(requestedYear) && requestedYear > 0) {
      setYear(requestedYear);
    }
  }, [requestedYear]);

  const totals = useMemo(() => {
    return history.reduce(
      (acc, curr) => ({
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        savings: acc.savings + curr.savings,
      }),
      { income: 0, expense: 0, savings: 0 },
    );
  }, [history]);

  const currencyFormatter = (value: number) => new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

  const tooltipFormatter = (value: number) => new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(value);

  const compactFormatter = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  const CustomizedLabel = ({ x, y, value }: LabelProps) => {
    const numericValue = Number(value ?? 0);
    const fill = numericValue >= 0 ? "var(--income-600)" : "var(--expense-600)";
    return (
      <text x={x} y={y} dy={-10} fill={fill} fontSize={13} textAnchor="middle" fontWeight="600">
        {compactFormatter(numericValue)}
      </text>
    );
  };

  const handleBarClick = (data: { month?: number }) => {
    if (data.month) {
      const monthStr = data.month.toString().padStart(2, "0");
      navigate(`/reports/category?interval=${year}-${monthStr}`);
    }
  };

  const summaryRows = history.map((item: HistoryReportItem) => ({
    key: item.month,
    label: item.monthName,
    value: <Num value={item.savings} currency={currency} kind={item.savings >= 0 ? "income" : "expense"} />,
    detail: `${t("reports.income")}: ${tooltipFormatter(item.income)} | ${t("reports.expense")}: ${tooltipFormatter(item.expense)}`,
  }));

  return (
    <div className="reports-workspace">
      <section className="report-panel">
        <div className="report-toolbar">
          <div>
            <span className="reports-hub-section__title">{t("reports.interval")}</span>
            <h2 className="report-title">{t("reports.historyReport")}</h2>
          </div>
          <div className="report-toolbar__control">
            <label className="report-toolbar__label" htmlFor="report-history-year">
              {t("reports.yearControl")}
            </label>
            <DatePicker
              id="report-history-year"
              picker="year"
              value={dayjs().year(year)}
              onChange={handleYearChange}
              allowClear={false}
              inputReadOnly
            />
          </div>
        </div>
      </section>

      <section className="report-stat-grid" aria-label={t("reports.summaryTitle")}>
        <div className="report-stat">
          <span>{t("reports.totalIncome")}</span>
          <strong><ArrowUp size={16} aria-hidden="true" /> <Num value={totals.income} currency={currency} kind="income" /></strong>
        </div>
        <div className="report-stat">
          <span>{t("reports.totalExpense")}</span>
          <strong><ArrowDown size={16} aria-hidden="true" /> <Num value={Math.abs(totals.expense)} currency={currency} kind="expense" /></strong>
        </div>
        <div className="report-stat">
          <span>{t("reports.savings")}</span>
          <strong><Banknote size={16} aria-hidden="true" /> <Num value={totals.savings} currency={currency} kind={totals.savings >= 0 ? "income" : "expense"} /></strong>
        </div>
      </section>

      <section className="report-panel">
        <div className="report-chart-box" aria-busy={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history} margin={{ top: 30, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid stroke="var(--border-1)" />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <XAxis dataKey="monthName" />
              <YAxis tickFormatter={currencyFormatter} domain={[(dataMin: number) => dataMin * 1.2, (dataMax: number) => dataMax * 1.2]} />
              <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
              <Legend />
              <Bar dataKey="income" barSize={20} fill="var(--income-200)" name={t("reports.income")} onClick={(data) => handleBarClick(data as { month?: number })} cursor="pointer">
                <LabelList dataKey="income" position="top" formatter={(value: number) => compactFormatter(value)} fill="var(--income-600)" />
              </Bar>
              <Bar dataKey="expense" barSize={20} fill="var(--expense-200)" name={t("reports.expense")} onClick={(data) => handleBarClick(data as { month?: number })} cursor="pointer">
                <LabelList dataKey="expense" position="top" formatter={(value: number) => compactFormatter(value)} fill="var(--expense-600)" />
              </Bar>
              <Line type="monotone" dataKey="savings" stroke="var(--brand-ink)" name={t("reports.savings")}>
                <LabelList dataKey="savings" content={<CustomizedLabel />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {summaryRows.length > 0 && (
        <ReportAccessibleSummary
          title={t("reports.historySummaryTitle")}
          caption={t("reports.historySummaryCaption")}
          labelHeader={t("reports.month")}
          valueHeader={t("reports.summaryValue")}
          rows={summaryRows}
        />
      )}
    </div>
  );
};

export default ReportMonthlyHistory;
