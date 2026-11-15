import { useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ReportCategoryDetails, getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import { reportActions } from "../../store/report/report-slice";
import { useGetCategoriesQuery } from "../../store/categories/categories-api";
import { useGetCategoryReportQuery } from "../../store/report/report-api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createFixedAmountFormatter } from "../../utils/formatAmount";
import type { ReportsHubContext } from "../Reports";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import ReportSummaryMetrics from "./ReportSummaryMetrics";
import "./reports.css";
import "./category-report.css";

const categoryTableComponents = {
    table: (props: ComponentPropsWithoutRef<"table">) => <table {...props} role="table" />,
    body: {
        wrapper: (props: ComponentPropsWithoutRef<"tbody">) => <tbody {...props} role="rowgroup" />,
        cell: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
            <td {...props} role="cell"><div>{children}</div></td>
        ),
    },
};

const ReportCategory = () => {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? i18n.language;
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

    const formatters = useMemo(() => {
        const minorDigits = currency
            ? new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().minimumFractionDigits ?? 2
            : 2;
        return {
            minorDigits,
            amount: createFixedAmountFormatter(locale, minorDigits),
            signedAmount: createFixedAmountFormatter(locale, minorDigits, "exceptZero"),
            share: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
        };
    }, [currency, locale]);
    const normalizeAmount = (value: number) => Math.abs(value) < 0.5 / 10 ** formatters.minorDigits ? 0 : value;
    const renderAmount = (amount: string) => <>{amount}{currency && <> <small>{currency}</small></>}</>;
    const renderMoney = (value: number) => renderAmount(formatters.amount.format(normalizeAmount(value)));
    const getShare = (value: number) => {
        const total = value > 0 ? totals.totalIncome : Math.abs(totals.totalExpenses);
        return total === 0 ? 0 : Math.abs(value) / total;
    };
    const getTone = (value: number) => value > 0 ? "income" : value < 0 ? "expense" : "neutral";

    const reportColumns: ColumnsType<ReportCategoryDetails> = [
        {
            title: t("reports.category"),
            key: "name",
            className: "category-report__name",
            width: "34%",
            render: (_, item) => (
                <button type="button" className="reports-link-button" onClick={() => openTransactions(item)}>
                    {item.name}
                </button>
            ),
        },
        {
            title: t("reports.distribution"),
            key: "distribution",
            className: "category-report__distribution",
            render: (_, item) => (
                <div className="category-report__track" aria-hidden="true">
                    <div data-tone={getTone(item.value)} style={{ width: `${Math.min(1, getShare(item.value)) * 100}%` }} />
                </div>
            ),
        },
        {
            title: t("reports.share"),
            key: "share",
            className: "category-report__share",
            width: "12%",
            render: (_, item) => formatters.share.format(getShare(item.value)),
        },
        {
            title: t("reports.amount"),
            key: "value",
            className: "category-report__amount",
            width: "28%",
            render: (_, item) => <span data-tone={getTone(item.value)}>{renderMoney(item.value)}</span>,
        },
    ];

    const summary = [
        { key: "income", label: t("reports.income"), amount: formatters.amount.format(totals.totalIncome), tone: "income" },
        { key: "expense", label: t("reports.expenses"), amount: formatters.amount.format(Math.abs(totals.totalExpenses)), tone: "expense" },
        {
            key: "balance",
            label: t("reports.netCashFlow"),
            amount: formatters.signedAmount.format(normalizeAmount(totalBalance)),
            tone: getTone(normalizeAmount(totalBalance)),
            highlight: true,
        },
    ].map(({ amount, ...metric }) => ({
        ...metric,
        value: renderAmount(amount),
        amountWidth: amount.length * 0.62,
    }));

    const transferMetrics = internalTransfers && [
        { key: "received", label: t("reports.internalTransfersReceived"), value: renderMoney(internalTransfers.amountReceived) },
        { key: "sent", label: t("reports.internalTransfersSent"), value: renderMoney(-internalTransfers.amountSent) },
        { key: "net", label: t("reports.internalTransfersNetChange"), value: renderMoney(internalTransfers.netChange) },
        { key: "count", label: t("reports.internalTransfersCount"), value: internalTransfers.transactionCount },
    ];

    const summaryRows = report.map((item) => ({
        key: item.id,
        label: item.name,
        value: renderMoney(item.value),
        detail: item.value > 0 ? t("reports.income") : t("reports.expense"),
    }));

    return (
        <div className="reports-workspace category-report">
            <section className="report-summary" aria-label={t("reports.summaryTitle")}>
                <ReportSummaryMetrics metrics={summary} />
            </section>

            <section className="report-panel category-report__panel">
                <Spin spinning={isLoading}>
                    <div className="report-table-wrap">
                        <Table
                            className="report-table"
                            rowKey={(record) => record.id.toString()}
                            columns={reportColumns}
                            components={categoryTableComponents}
                            onRow={() => ({ role: "row" })}
                            expandable={{
                                indentSize: 18,
                                expandIcon: ({ expanded, record, onExpand }) => {
                                    if (!record.children.length) return <span className="category-report__toggle-spacer" aria-hidden="true" />;
                                    return (
                                        <button
                                            type="button"
                                            className="category-report__toggle"
                                            aria-expanded={expanded}
                                            aria-label={t(expanded ? "reports.collapseCategory" : "reports.expandCategory", { category: record.name })}
                                            onClick={(event) => onExpand(record, event)}
                                        >
                                            {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                        </button>
                                    );
                                },
                                onExpand: (expanded, record) => {
                                    setExpandedRows(expanded ? [record.id.toString()] : []);
                                },
                                expandedRowKeys: expandedRows,
                            }}
                            dataSource={report}
                            pagination={false}
                            tableLayout="fixed"
                            sticky
                        />
                    </div>
                </Spin>
            </section>

            {internalTransfers && transferMetrics && (
                <details
                    className="category-report__transfers"
                    key={`${startDate}:${selectedLinkedUserId}`}
                    open={internalTransfers.transactionCount > 0}
                >
                    <summary>
                        <span className="category-report__transfers-title">{t("reports.internalTransfers")}</span>
                        <span className="category-report__transfers-preview">
                            {transferMetrics.slice(0, 2).map(({ key, label, value }) => (
                                <span key={key}>{label}: <span className="category-report__transfer-value">{value}</span></span>
                            ))}
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                    </summary>
                    <ReportSummaryMetrics metrics={transferMetrics} />
                </details>
            )}

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
