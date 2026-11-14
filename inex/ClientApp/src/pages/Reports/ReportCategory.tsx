import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Num } from "../../components/primitives";
import { ReportCategoryDetails, getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import { reportActions } from "../../store/report/report-slice";
import { useGetCategoriesQuery } from "../../store/categories/categories-api";
import { useGetCategoryReportQuery } from "../../store/report/report-api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ReportsHubContext } from "../Reports";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import ReportSummaryMetrics from "./ReportSummaryMetrics";
import "./reports.css";

const ReportCategory = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { reportMonth: currentDate } = useOutletContext<ReportsHubContext>();
    const filterData = useAppSelector(state => state.transactions.filter);
    const filter = useAppSelector(state => state.report.filter);
    const selectedLinkedUserId = useAppSelector(state => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector(state => state.linkedAccount.linkState?.linkedAccounts.find(
        (account) => account.id === state.linkedAccount.selectedLinkedUserId,
    ));
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const startDate = currentDate.isValid() ? currentDate.startOf("month").format("YYYY-MM-DD") : "";
    const endDate = currentDate.isValid() ? currentDate.endOf("month").format("YYYY-MM-DD") : "";
    const requestedCurrency = selectedLinkedAccount?.baseCurrency ?? "USD";
    const { currentData: allCategories = [] } = useGetCategoriesQuery(
        selectedLinkedUserId === null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const { currentData: reportResponse, isFetching: isLoading } = useGetCategoryReportQuery(
        {
            startDate,
            endDate,
            currency: requestedCurrency,
            linkedUserId: selectedLinkedUserId,
        },
        { skip: !currentDate.isValid() },
    );
    const reportData = reportResponse?.data ?? [];
    const currency = reportResponse?.metadata.currency ?? "";
    const internalTransfers = reportResponse?.metadata.internalTransfers;
    const activeCategories = useMemo(
        () => allCategories.filter((category) => category.isEnabled),
        [allCategories],
    );
    const report = useMemo(
        () => getCategoryReport(activeCategories, reportData),
        [activeCategories, reportData],
    );

    useEffect(() => {
        if (currentDate.isValid()) {
            const range = [currentDate.startOf("month").unix(), currentDate.endOf("month").unix()];

            dispatch(reportActions.setFilter({
                filter: {
                    ...filterData,
                    range,
                },
            }));
        }
        return () => {
            dispatch(reportActions.setFilter({ filter: { range: [] } }));
        };
    }, [currentDate, dispatch, filterData]);

    useEffect(() => {
        setExpandedRows([]);
    }, [startDate, endDate, selectedLinkedUserId]);

    useEffect(() => {
        if (!reportResponse || selectedLinkedUserId !== null) return;

        dispatch(reportActions.setDetails({
            title: reportResponse.metadata.name,
            items: reportResponse.data,
            currency: reportResponse.metadata.currency,
        }));
    }, [dispatch, reportResponse, selectedLinkedUserId]);

    const openTransactions = (item: ReportCategoryDetails) => {
        if (!filter.range?.[0] || !filter.range?.[1]) return;
        const start = new Date(filter.range[0] * 1000);
        const startStr = `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}-${start.getUTCDate()}`;
        const end = new Date(filter.range[1] * 1000);
        const endStr = `${end.getUTCFullYear()}-${end.getUTCMonth() + 1}-${end.getUTCDate()}`;
        navigate(`../../transactions?filter=categoryIds:${item.id};start:${startStr};end:${endStr};`, { replace: false });
    };

    const reportColumns: ColumnsType<ReportCategoryDetails> = [
        {
            title: t("reports.category"),
            key: "name",
            render: (_, item) => (
                <button type="button" className="reports-link-button" onClick={() => openTransactions(item)}>
                    {item.name}
                </button>
            ),
        },
        {
            title: t("reports.amount"),
            key: "value",
            width: 170,
            align: "right",
            render: (_, item) => (
                <Num
                    value={Math.abs(item.value)}
                    currency={currency}
                    kind={item.value > 0 ? "income" : "expense"}
                />
            ),
        },
    ];

    const totals = useMemo(() => {
        return report.reduce(
            (acc, item) => {
                if (item.value > 0) {
                    acc.totalIncome += item.value;
                } else {
                    acc.totalExpenses += item.value;
                }
                return acc;
            },
            { totalIncome: 0, totalExpenses: 0 },
        );
    }, [report]);
    const totalBalance = totals.totalIncome + totals.totalExpenses;

    const summaryRows = report.map((item) => ({
        key: item.id,
        label: item.name,
        value: <Num value={Math.abs(item.value)} currency={currency} kind={item.value > 0 ? "income" : "expense"} />,
        detail: item.value > 0 ? t("reports.income") : t("reports.expense"),
    }));

    return (
        <div className="reports-workspace">
            <section className="report-summary" aria-label={t("reports.summaryTitle")}>
                <ReportSummaryMetrics metrics={[
                    { label: t("reports.totalIncome"), value: <Num currencySize="sm" value={totals.totalIncome} currency={currency} kind="income" /> },
                    { label: t("reports.totalExpense"), value: <Num currencySize="sm" value={Math.abs(totals.totalExpenses)} currency={currency} kind="expense" /> },
                    { label: t("reports.balance"), value: <Num currencySize="sm" value={totalBalance} currency={currency} kind={totalBalance >= 0 ? "income" : "expense"} />, highlight: true },
                ]} />
                {internalTransfers && (
                    <section className="report-summary__group" aria-labelledby="internal-transfer-summary-title">
                        <h2 id="internal-transfer-summary-title">{t("reports.internalTransfers")}</h2>
                        <ReportSummaryMetrics metrics={[
                            { label: t("reports.internalTransfersReceived"), value: <Num currencySize="sm" value={internalTransfers.amountReceived} currency={currency} kind="transfer" /> },
                            { label: t("reports.internalTransfersSent"), value: <Num currencySize="sm" value={-internalTransfers.amountSent} currency={currency} kind="transfer" /> },
                            { label: t("reports.internalTransfersNetChange"), value: <Num currencySize="sm" value={internalTransfers.netChange} currency={currency} kind="transfer" /> },
                            { label: t("reports.internalTransfersCount"), value: internalTransfers.transactionCount },
                        ]} />
                    </section>
                )}
            </section>

            <section className="report-panel">
                <Spin spinning={isLoading}>
                    <div className="report-table-wrap">
                        <Table
                            className="report-table"
                            rowKey={(record) => record.id.toString()}
                            columns={reportColumns}
                            expandable={{
                                indentSize: 50,
                                rowExpandable: () => false,
                                onExpand: (expanded, record) => {
                                    setExpandedRows(expanded ? [record.id.toString()] : []);
                                },
                                expandedRowKeys: expandedRows,
                            }}
                            dataSource={report}
                            pagination={false}
                            sticky
                        />
                    </div>
                </Spin>
            </section>

            {summaryRows.length > 0 && (
                <ReportAccessibleSummary
                    title={t("reports.categorySummaryTitle")}
                    caption={t("reports.categorySummaryCaption")}
                    labelHeader={t("reports.category")}
                    valueHeader={t("reports.amount")}
                    rows={summaryRows}
                />
            )}
        </div>
    );
};

export default ReportCategory;
