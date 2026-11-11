import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useGetHistoryReportQuery } from "../../store/report/report-api";
import { useAppSelector } from "../../store/hooks";
import { createFixedAmountFormatter } from "../../utils/formatAmount";
import type { ReportsHubContext } from "../Reports";
import CashFlowChart from "./CashFlowChart";
import type { CashFlowSeries } from "./CashFlowChart";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import "./cash-flow.css";

const ReportMonthlyHistory = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const navigate = useNavigate();
  const { historyYear: year } = useOutletContext<ReportsHubContext>();
  const selectedLinkedUserId = useAppSelector((state) => state.linkedAccount.selectedLinkedUserId);
  const selectedLinkedAccount = useAppSelector((state) => state.linkedAccount.linkState?.linkedAccounts.find(
    (account) => account.id === state.linkedAccount.selectedLinkedUserId,
  ));
  const currency = selectedLinkedAccount?.baseCurrency ?? "USD";
  const { currentData: historyResponse, isFetching: isLoading } = useGetHistoryReportQuery({
    year,
    currency,
    linkedUserId: selectedLinkedUserId,
  });
  const formatters = useMemo(() => {
    const currencyFormat = new Intl.NumberFormat(locale, { style: "currency", currency });
    const minorDigits = currencyFormat.resolvedOptions().minimumFractionDigits ?? 2;
    return {
      minorDigits,
      amount: createFixedAmountFormatter(locale, minorDigits),
      signedAmount: createFixedAmountFormatter(locale, minorDigits, "exceptZero"),
      shortMonth: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
      longMonth: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }, [locale, currency]);
  const history = useMemo(() => (historyResponse?.data ?? []).map((item) => {
    const monthDate = new Date(0);
    monthDate.setUTCFullYear(year, item.month - 1, 1);
    return {
      ...item,
      shortMonth: formatters.shortMonth.format(monthDate),
      longMonth: formatters.longMonth.format(monthDate),
    };
  }), [historyResponse, formatters, year]);

  const totals = history.reduce(
    (acc, curr) => ({
      income: acc.income + curr.income,
      expense: acc.expense + curr.expense,
      savings: acc.savings + curr.savings,
    }),
    { income: 0, expense: 0, savings: 0 },
  );
  const formatMetric = (value: number, key: CashFlowSeries) => {
    const normalized = Math.abs(value) < 0.5 / 10 ** formatters.minorDigits ? 0 : value;
    if (key === "savings") {
      return {
        amount: formatters.signedAmount.format(normalized),
        tone: normalized > 0 ? "income" : normalized < 0 ? "expense" : "neutral",
      };
    }
    return { amount: formatters.amount.format(Math.abs(normalized)), tone: key };
  };
  const formatMoney = (value: number, key: CashFlowSeries) => `${formatMetric(value, key).amount} ${currency}`;
  const metrics = [
    { key: "income", label: t("reports.income") },
    { key: "expense", label: t("reports.expenses") },
    { key: "savings", label: t("reports.netCashFlow") },
  ] as const;
  const summary = metrics.map(({ key, label }) => ({ key, label, ...formatMetric(totals[key], key) }));
  const getMonthPath = (month: number) => `/reports/category?interval=${year}-${String(month).padStart(2, "0")}`;
  const summaryRows = history.map((item) => ({
    key: item.month,
    label: item.longMonth,
    value: formatMoney(item.savings, "savings"),
    detail: `${t("reports.income")}: ${formatMoney(item.income, "income")} | ${t("reports.expenses")}: ${formatMoney(item.expense, "expense")}`,
  }));

  return (
    <div className="reports-workspace cash-flow-report">
      <section className="cash-flow-summary" aria-label={t("reports.summaryTitle")}>
        <dl>
          {summary.map(({ key, label, amount, tone }) => (
            <div key={key} className={key === "savings" ? "cash-flow-summary__net" : undefined}>
              <dt>{label}</dt>
              <dd data-tone={tone} style={{ "--amount-width": amount.length * 0.62 } as CSSProperties}>
                {amount} <small>{currency}</small>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <CashFlowChart
        key={`${selectedLinkedUserId}:${year}:${currency}`}
        history={history}
        locale={locale}
        isLoading={isLoading}
        currency={currency}
        formatMetric={formatMetric}
        getMonthPath={getMonthPath}
        onOpenMonth={(month) => navigate(getMonthPath(month))}
      />

      {summaryRows.length > 0 && (
        <ReportAccessibleSummary
          title={t("reports.historySummaryTitle")}
          caption={t("reports.historySummaryCaption")}
          labelHeader={t("reports.month")}
          valueHeader={t("reports.netCashFlow")}
          rows={summaryRows}
        />
      )}
    </div>
  );
};

export default ReportMonthlyHistory;
