import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DatePicker, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { ArrowDown, ArrowUp, Banknote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Num } from "../../components/primitives";
import { ReportCategoryDetails, getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import { reportActions } from "../../store/report/report-slice";
import { useGetCategoriesQuery } from "../../store/categories/categories-api";
import { useGetCategoryReportQuery } from "../../store/report/report-api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ReportAccessibleSummary from "./ReportAccessibleSummary";
import "./reports.css";

const dateFormat = "YYYY-MM";

const ReportCategory = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const filterData = useAppSelector(state => state.transactions.filter);
    const filter = useAppSelector(state => state.report.filter);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const queryParams = new URLSearchParams(location.search);
    const interval = queryParams.get("interval");
    const currentDate = useMemo(() => interval ? dayjs(interval, dateFormat) : dayjs(), [interval]);
    const startDate = currentDate.isValid() ? currentDate.startOf("month").format("YYYY-MM-DD") : "";
    const endDate = currentDate.isValid() ? currentDate.endOf("month").format("YYYY-MM-DD") : "";
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const { data: reportResponse, isLoading } = useGetCategoryReportQuery(
        { startDate, endDate },
        { skip: !currentDate.isValid() },
    );
    const reportData = reportResponse?.data ?? [];
    const currency = reportResponse?.metadata.currency ?? "";
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
    }, [startDate, endDate]);

    useEffect(() => {
        if (!reportResponse) return;

        dispatch(reportActions.setDetails({
            title: reportResponse.metadata.name,
            items: reportResponse.data,
            currency: reportResponse.metadata.currency,
        }));
    }, [dispatch, reportResponse]);

    const setIntervalHandler = (date: Dayjs | null) => {
        if (date) navigate(`${location.pathname}?interval=${date.format(dateFormat)}`, { replace: false });
    };

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
            <section className="report-panel">
                <div className="report-toolbar">
                    <div>
                        <span className="reports-hub-section__title">{t("reports.interval")}</span>
                        <h2 className="report-title">{t("reports.categoryReport")}</h2>
                    </div>
                    <div className="report-toolbar__control">
                        <label className="report-toolbar__label" htmlFor="report_interval">
                            {t("reports.monthControl")}
                        </label>
                        <DatePicker
                            id="report_interval"
                            picker="month"
                            value={currentDate.isValid() ? currentDate : null}
                            inputReadOnly
                            onChange={setIntervalHandler}
                            allowClear={false}
                        />
                    </div>
                </div>
            </section>

            <section className="report-stat-grid" aria-label={t("reports.summaryTitle")}>
                <div className="report-stat">
                    <span>{t("reports.totalIncome")}</span>
                    <strong><ArrowUp size={16} aria-hidden="true" /> <Num value={totals.totalIncome} currency={currency} kind="income" /></strong>
                </div>
                <div className="report-stat">
                    <span>{t("reports.totalExpense")}</span>
                    <strong><ArrowDown size={16} aria-hidden="true" /> <Num value={Math.abs(totals.totalExpenses)} currency={currency} kind="expense" /></strong>
                </div>
                <div className="report-stat">
                    <span>{t("reports.balance")}</span>
                    <strong><Banknote size={16} aria-hidden="true" /> <Num value={totalBalance} currency={currency} kind={totalBalance >= 0 ? "income" : "expense"} /></strong>
                </div>
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
