import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Layout, Table, Tabs, Space, Typography, Row, Col, Card, Statistic } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { DatePicker } from "antd";
import { ReportCategoryDetails, getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import type { TableColumnsType } from "antd";
import { reportActions } from "../../store/report/report-slice";
import { CategoryResponse, useGetCategoriesQuery } from "../../store/categories/categories-api";
import { useGetCategoryReportQuery } from "../../store/report/report-api";

const { Text, Title } = Typography;

const dateFormat: string = "YYYY-MM";

const ReportCategory = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const filterData = useAppSelector(state => state.transactions.filter);

    const queryParams: URLSearchParams = new URLSearchParams(location.search);
    const interval: string | null = queryParams.get("interval");
    const currentDate: Dayjs = useMemo(() => interval ? dayjs(interval, dateFormat) : dayjs(), [interval]);
    const startDate = currentDate.isValid() ? currentDate.startOf("month").format("YYYY-MM-DD") : "";
    const endDate = currentDate.isValid() ? currentDate.endOf("month").format("YYYY-MM-DD") : "";

    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const activeCategories = allCategories.filter((c: CategoryResponse) => c.isEnabled);
    const { data: reportResponse, isLoading } = useGetCategoryReportQuery(
        { startDate, endDate },
        { skip: !currentDate.isValid() }
    );
    const reportData = reportResponse?.data ?? [];
    const currency = reportResponse?.metadata.currency ?? "";
    const filter = useAppSelector(state => state.report.filter);

    const report: ReportCategoryDetails[] = getCategoryReport(activeCategories, reportData);

    useEffect(() => {
        if (currentDate.isValid()) {
            const range = [currentDate.startOf("month").unix(), currentDate.endOf("month").unix()];

            dispatch(
                reportActions.setFilter({
                    filter: {
                        ...filterData,
                        range: range,
                    },
                })
            );
        }
        return () => {
            dispatch(reportActions.setFilter({ filter: { range: [] } }));
        };
    }, [currentDate]);

    useEffect(() => {
        setExpandedRows([]);
    }, [startDate, endDate]);

    useEffect(() => {
        if (!reportResponse) {
            return;
        }

        dispatch(reportActions.setDetails({
            title: reportResponse.metadata.name,
            items: reportResponse.data,
            currency: reportResponse.metadata.currency,
        }));
    }, [dispatch, reportResponse]);

    const setIntervalHandler = (date: any) => {
        if (date) {
            navigate(`${location.pathname}?interval=${date.format(dateFormat)}`, { replace: false });
        }
    };

    const rowExpandHandler = (expanded: boolean, record: any) => {
        if (expanded) {
            setExpandedRows(record ? [record.id.toString()] : []);
        } else {
            setExpandedRows([]);
        }
    };

    const reportColumns: TableColumnsType<ReportCategoryDetails> = [
        {
            title: t("reports.category"),
            key: "name",
            render: (text: string, item: any) => (
                <a onClick={(event) => {
                    event.stopPropagation();
                    const start: Date = new Date(filter.range[0] * 1000);
                    const startStr: string = `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}-${start.getUTCDate()}`;
                    const end: Date = new Date(filter.range[1] * 1000);
                    const endStr: string = `${end.getUTCFullYear()}-${end.getUTCMonth() + 1}-${end.getUTCDate()}`;
                    navigate(`../../transactions?filter=categoryIds:${item.id};start:${startStr};end:${endStr};`, { replace: false });
                }}>
                    {item.name}
                </a>
            )
        },
        {
            title: t("reports.amount"),
            key: "value",
            width: 170,
            align: "right",
            render: (text: string, item: any) => {
                let textColor = item.value > 0 ? "green" : "red";
                return (
                    <span style={{ color: textColor }}>
                        {(Math.round((item.value > 0 ? item.value : 0 - item.value) * 100) / 100).toFixed(2)} {currency}
                    </span>
                );
            },
        },
    ];

    const totals = useMemo(() => {
        let totalIncome = 0;
        let totalExpences = 0;
        report.forEach(({ value }) => {
            if (value > 0) {
                totalIncome += value;
            } else {
                totalExpences += value;
            }
        });
        const totalBalance = totalIncome + totalExpences;
        return { totalIncome, totalExpences, totalBalance };
    }, [report]);

    return (
        <div style={{ padding: "20px" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Space>
                    <Title level={4}>{t("reports.interval")}</Title>
                    <DatePicker
                        id="report_interval"
                        key="report_interval"
                        size="large"
                        picker="month"
                        value={currentDate.isValid() ? currentDate : null}
                        bordered={true}
                        inputReadOnly={true}
                        onChange={setIntervalHandler}
                        allowClear={false}
                    />
                </Space>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title={t("reports.totalIncome")}
                                value={totals.totalIncome}
                                precision={2}
                                suffix={currency}
                                valueStyle={{ color: "green" }}
                                prefix={<ArrowUpOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title={t("reports.totalExpense")}
                                value={Math.abs(totals.totalExpences)}
                                precision={2}
                                suffix={currency}
                                valueStyle={{ color: "red" }}
                                prefix={<ArrowDownOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title={t("reports.balance")}
                                value={totals.totalBalance}
                                precision={2}
                                suffix={currency}
                                valueStyle={{ color: totals.totalBalance >= 0 ? "green" : "red" }}
                                prefix={<BankOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Table
                    rowKey={(record: any) => record.id.toString()}
                    loading={isLoading}
                    columns={reportColumns}
                    expandable={{
                        indentSize: 50,
                        rowExpandable: (record: any) => false,
                        onExpand: rowExpandHandler,
                        expandedRowKeys: expandedRows,
                    }}
                    dataSource={report}
                    pagination={false}
                    sticky
                />
            </Space>
        </div>
    );
};

export default ReportCategory;
