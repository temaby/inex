import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useGetHistoryReportQuery } from "../../store/report/report-api";
import { useAppSelector } from "../../store/hooks";
import type { ReportsHubContext } from "../Reports";
import CashFlowChart from "./CashFlowChart";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import "./cash-flow.css";

const decimalPlaces = (value: number) => {
  const [coefficient, exponent = "0"] = String(value).split("e");
  return (coefficient.split(".")[1]?.length ?? 0) - Number(exponent);
};

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
      exact: new Intl.NumberFormat(locale, { minimumFractionDigits: minorDigits, maximumFractionDigits: 20 }),
      shortMonth: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
      longMonth: new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }),
    };
  }, [locale, currency]);
  const history = useMemo(() => (historyResponse?.data ?? []).map((item) => {
    const monthDate = Date.UTC(2000, item.month - 1, 1);
    return {
      ...item,
      shortMonth: formatters.shortMonth.format(monthDate),
      longMonth: formatters.longMonth.format(monthDate),
    };
  }), [historyResponse, formatters]);

  const totals = history.reduce(
    (acc, curr) => ({
      income: acc.income + curr.income,
      expense: acc.expense + curr.expense,
      savings: acc.savings + curr.savings,
    }),
    { income: 0, expense: 0, savings: 0 },
  );
  const formatMoney = (value: number) => `${formatters.exact.format(Math.abs(value) < 5e-21 ? 0 : value)} ${currency}`;
  const metrics = [
    { key: "income", label: t("reports.income"), tone: "income" },
    { key: "expense", label: t("reports.expenses"), tone: "expense" },
    { key: "savings", label: t("reports.netCashFlow"), tone: totals.savings > 0 ? "income" : totals.savings < 0 ? "expense" : "neutral" },
  ] as const;
  const summary = metrics.map(({ key, label, tone }) => {
    // Show the precision of the reported months without exposing floating-point addition artifacts.
    const digits = Math.min(20, Math.max(formatters.minorDigits, ...history.map((month) => decimalPlaces(month[key]))));
    const value = key === "expense" ? Math.abs(totals[key]) : totals[key];
    const normalized = Math.abs(value) < 0.5 / 10 ** digits ? 0 : value;
    const amount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: formatters.minorDigits,
      maximumFractionDigits: digits,
    }).format(normalized);
    return { key, label, amount, tone: key === "savings" && normalized === 0 ? "neutral" : tone };
  });
  const getMonthPath = (month: number) => `/reports/category?interval=${year}-${String(month).padStart(2, "0")}`;
  const summaryRows = history.map((item) => ({
    key: item.month,
    label: item.longMonth,
    value: formatMoney(item.savings),
    detail: `${t("reports.income")}: ${formatMoney(item.income)} | ${t("reports.expenses")}: ${formatMoney(item.expense)}`,
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
        formatMoney={formatMoney}
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
