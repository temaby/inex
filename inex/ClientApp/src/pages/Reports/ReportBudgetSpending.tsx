import React, { useEffect } from "react";
import { Alert, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { BudgetProgress, Num } from "../../components/primitives";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";
import { useGetBudgetReportQuery } from "../../store/budgetReport/budgetReport-api";
import { budgetReportActions } from "../../store/budgetReport/budgetReport-slice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ReportsHubContext } from "../Reports";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import ReportSummaryMetrics from "./ReportSummaryMetrics";
import "./reports.css";

const ReportBudgetSpending: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { reportMonth } = useOutletContext<ReportsHubContext>();
    const year = reportMonth.year();
    const month = reportMonth.month() + 1;
    const reportCurrency = useAppSelector(state => state.report.currency) || "USD";
    const selectedLinkedUserId = useAppSelector(state => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector(state => state.linkedAccount.linkState?.linkedAccounts.find(
        (account) => account.id === state.linkedAccount.selectedLinkedUserId,
    ));
    const currency = selectedLinkedAccount?.baseCurrency ?? reportCurrency;
    const { currentData: data, isError, isFetching: isLoading } = useGetBudgetReportQuery({
        year,
        month,
        currency,
        linkedUserId: selectedLinkedUserId,
    });
    const items = data?.data ?? [];
    const metadata = data?.metadata;

    useEffect(() => {
        dispatch(budgetReportActions.setPeriod({ year, month }));
    }, [dispatch, year, month]);

    const totalBudget = items.reduce((sum, item) => sum + item.budgetedAmount, 0);
    const totalSpent = items.reduce((sum, item) => sum + item.spentAmount, 0);
    const totalRemainingRaw = totalBudget - totalSpent;
    const totalRemaining = Math.abs(totalRemainingRaw) < 0.01 ? 0 : totalRemainingRaw;
    const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const realIncome = metadata?.totalIncome || 0;
    const realOutcome = metadata?.totalOutcome || 0;
    const unbudgetedRaw = realOutcome - totalSpent;
    const unbudgetedSpending = Math.abs(unbudgetedRaw) < 0.01 ? 0 : unbudgetedRaw;
    const balanceRaw = realIncome - realOutcome;
    const balance = Math.abs(balanceRaw) < 0.01 ? 0 : balanceRaw;

    const openBudgetTransactions = (record: BudgetComparisonDTO) => {
        if (record.categoryIds && record.categoryIds.length > 0) {
            const start = reportMonth.startOf("month").format("YYYY-MM-DD");
            const end = reportMonth.endOf("month").format("YYYY-MM-DD");
            navigate(`/transactions?filter=categoryIds:${record.categoryIds.join(",")};start:${start};end:${end}`);
        }
    };

    const columns: ColumnsType<BudgetComparisonDTO> = [
        {
            title: t("reports.category"),
            dataIndex: "categoryName",
            key: "categoryName",
            render: (_val: string, record) => (
                <button type="button" className="reports-link-button" onClick={() => openBudgetTransactions(record)}>
                    {record.categoryName}
                </button>
            ),
        },
        {
            title: t("reports.budget"),
            dataIndex: "budgetedAmount",
            key: "budgetedAmount",
            align: "right",
            render: (val: number) => <Num value={val} currency={currency} kind="neutral" />,
        },
        {
            title: t("reports.spent"),
            dataIndex: "spentAmount",
            key: "spentAmount",
            align: "right",
            render: (val: number) => <Num value={val} currency={currency} kind="expense" />,
        },
        {
            title: t("reports.progress"),
            dataIndex: "percentageUsed",
            key: "percentageUsed",
            render: (_val: number, record) => (
                <BudgetProgress
                    value={record.spentAmount}
                    max={record.budgetedAmount}
                    showLabel
                    overBudgetLabel={t("reports.overBudget")}
                />
            ),
        },
        {
            title: t("reports.remaining"),
            dataIndex: "remainingAmount",
            key: "remainingAmount",
            align: "right",
            render: (val: number) => <Num value={val} currency={currency} kind={val >= 0 ? "income" : "expense"} />,
        },
    ];

    const summaryRows = items.map((item) => ({
        label: item.categoryName,
        value: <Num value={item.remainingAmount} currency={currency} kind={item.remainingAmount >= 0 ? "income" : "expense"} />,
        detail: `${t("reports.spent")}: ${item.spentAmount.toFixed(2)} ${currency} | ${t("reports.budget")}: ${item.budgetedAmount.toFixed(2)} ${currency}`,
    }));

    return (
        <div className="reports-workspace">
            {isError && (
                <Alert type="error" message={t("reports.budgetReportError")} />
            )}

            <Spin spinning={isLoading}>
                <section className="report-summary" aria-label={t("reports.summaryTitle")}>
                    <ReportSummaryMetrics metrics={[
                        { label: t("reports.totalIncome"), value: <Num currencySize="sm" value={realIncome} currency={currency} kind="income" /> },
                        { label: t("reports.totalExpense"), value: <Num currencySize="sm" value={realOutcome} currency={currency} kind="expense" /> },
                        { label: t("reports.unbudgeted"), value: <Num currencySize="sm" value={unbudgetedSpending} currency={currency} kind={unbudgetedSpending > 0 ? "warn" : "neutral"} /> },
                        { label: t("reports.savings"), value: <Num currencySize="sm" value={balance} currency={currency} kind={balance >= 0 ? "income" : "expense"} /> },
                        { label: t("reports.totalBudget"), value: <Num currencySize="sm" value={totalBudget} currency={currency} kind="neutral" /> },
                        { label: t("reports.budgetSpent"), value: <Num currencySize="sm" value={totalSpent} currency={currency} kind="expense" /> },
                        { label: t("reports.used"), value: `${totalPercent.toFixed(1)}%` },
                        { label: t("reports.budgetRemaining"), value: <Num currencySize="sm" value={totalRemaining} currency={currency} kind={totalRemaining >= 0 ? "income" : "expense"} /> },
                    ]} />
                </section>

                <section className="report-panel">
                    <div className="report-mobile-list" aria-label={t("reports.budgetSummaryTitle")}>
                        {items.map((item) => (
                            <article className="report-mobile-list__item" key={item.categoryName}>
                                <div className="report-mobile-list__head">
                                    <button type="button" className="reports-link-button" onClick={() => openBudgetTransactions(item)}>
                                        {item.categoryName}
                                    </button>
                                    <Num
                                        value={item.remainingAmount}
                                        currency={currency}
                                        kind={item.remainingAmount >= 0 ? "income" : "expense"}
                                    />
                                </div>
                                <BudgetProgress
                                    value={item.spentAmount}
                                    max={item.budgetedAmount}
                                    showLabel
                                    overBudgetLabel={t("reports.overBudget")}
                                />
                                <dl className="report-mobile-list__metrics">
                                    <div>
                                        <dt>{t("reports.budget")}</dt>
                                        <dd><Num value={item.budgetedAmount} currency={currency} kind="neutral" /></dd>
                                    </div>
                                    <div>
                                        <dt>{t("reports.spent")}</dt>
                                        <dd><Num value={item.spentAmount} currency={currency} kind="expense" /></dd>
                                    </div>
                                    <div>
                                        <dt>{t("reports.used")}</dt>
                                        <dd>{item.percentageUsed.toFixed(1)}%</dd>
                                    </div>
                                </dl>
                            </article>
                        ))}
                    </div>
                    <div className="report-table-wrap report-table-wrap--desktop">
                        <Table
                            className="report-table"
                            dataSource={items}
                            columns={columns}
                            rowKey="categoryName"
                            pagination={false}
                        />
                    </div>
                </section>
            </Spin>

            {summaryRows.length > 0 && (
                <ReportAccessibleSummary
                    title={t("reports.budgetSummaryTitle")}
                    caption={t("reports.budgetSummaryCaption")}
                    valueHeader={t("reports.remaining")}
                    labelHeader={t("reports.category")}
                    rows={summaryRows}
                />
            )}
        </div>
    );
};

export default ReportBudgetSpending;
