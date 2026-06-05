import React, { useEffect, useState } from "react";
import { Alert, DatePicker, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { ArrowDown, ArrowUp, Banknote, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { BudgetProgress, Num } from "../../components/primitives";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";
import { useGetBudgetReportQuery } from "../../store/budgetReport/budgetReport-api";
import { budgetReportActions } from "../../store/budgetReport/budgetReport-slice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import "./reports.css";

const ReportBudgetSpending: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const currency = useAppSelector(state => state.report.currency) || "USD";
    const { selectedYear, selectedMonth } = useAppSelector(state => state.budgetReport);
    const interval = new URLSearchParams(location.search).get("interval");
    const requestedDate = interval ? dayjs(interval, "YYYY-MM") : null;
    const [localDate, setLocalDate] = useState(
        requestedDate?.isValid() ? requestedDate : dayjs(`${selectedYear}-${selectedMonth}`, "YYYY-M"),
    );
    const { data, isError, isLoading } = useGetBudgetReportQuery({
        year: localDate.year(),
        month: localDate.month() + 1,
        currency,
    });
    const items = data?.data ?? [];
    const metadata = data?.metadata;

    const handleDateChange = (date: Dayjs | null) => {
        if (date) {
            navigate(`/reports/budget?interval=${date.format("YYYY-MM")}`, { replace: false });
            setLocalDate(date);
        }
    };

    useEffect(() => {
        if (requestedDate?.isValid()) {
            setLocalDate(requestedDate);
        }
    }, [interval]);

    useEffect(() => {
        dispatch(budgetReportActions.setPeriod({
            year: localDate.year(),
            month: localDate.month() + 1,
        }));
    }, [dispatch, localDate]);

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
            const start = localDate.startOf("month").format("YYYY-MM-DD");
            const end = localDate.endOf("month").format("YYYY-MM-DD");
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
            <section className="report-panel">
                <div className="report-toolbar">
                    <div>
                        <span className="reports-hub-section__title">{t("reports.interval")}</span>
                        <h2 className="report-title">{t("reports.budgetReport")}</h2>
                    </div>
                    <div className="report-toolbar__control">
                        <span className="report-toolbar__label">{t("reports.monthControl")}</span>
                        <DatePicker picker="month" value={localDate} onChange={handleDateChange} allowClear={false} inputReadOnly />
                    </div>
                </div>
            </section>

            {isError && (
                <Alert type="error" message={t("reports.budgetReportError")} />
            )}

            <Spin spinning={isLoading}>
                <section className="report-stat-grid" aria-label={t("reports.summaryTitle")}>
                    <div className="report-stat">
                        <span>{t("reports.totalIncome")}</span>
                        <strong><ArrowUp size={16} aria-hidden="true" /> <Num value={realIncome} currency={currency} kind="income" /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.totalExpense")}</span>
                        <strong><ArrowDown size={16} aria-hidden="true" /> <Num value={realOutcome} currency={currency} kind="expense" /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.unbudgeted")}</span>
                        <strong><TriangleAlert size={16} aria-hidden="true" /> <Num value={unbudgetedSpending} currency={currency} kind={unbudgetedSpending > 0 ? "warn" : "neutral"} /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.savings")}</span>
                        <strong><Banknote size={16} aria-hidden="true" /> <Num value={balance} currency={currency} kind={balance >= 0 ? "income" : "expense"} /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.totalBudget")}</span>
                        <strong><Num value={totalBudget} currency={currency} kind="neutral" /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.budgetSpent")}</span>
                        <strong><Num value={totalSpent} currency={currency} kind="expense" /></strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.used")}</span>
                        <strong>{totalPercent.toFixed(1)}%</strong>
                    </div>
                    <div className="report-stat">
                        <span>{t("reports.budgetRemaining")}</span>
                        <strong><Num value={totalRemaining} currency={currency} kind={totalRemaining >= 0 ? "income" : "expense"} /></strong>
                    </div>
                </section>

                <section className="report-panel">
                    <div className="report-table-wrap">
                        <Table
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
