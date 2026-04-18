import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Layout, Table, Tabs, Space, Typography, Row, Col, Card, Statistic } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import DatePicker from "../../components/DatePicker";
import { ReportCategoryDetails, getCategoryReport } from "../../model/Report/ReportCategoryDetails";
import { ColumnsType } from "antd/es/table";
import { fetchReport } from "../../store/report/report-actions";
import { reportActions } from "../../store/report/report-slice";

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

    const allCategories = useAppSelector(state => state.categories.items);
    const activeCategories = allCategories.filter((c: any) => c.isEnabled);
    const reportData = useAppSelector(state => state.report.items);
    const currency = useAppSelector(state => state.report.currency);
    const filter = useAppSelector(state => state.report.filter);
    const isLoading = useAppSelector(state => state.report.isLoading);

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
    }, [currentDate]);

    useEffect(() => {
        if (filter.range.length === 0) {
            return;
        }
        dispatch(fetchReport("category", filter));
        setExpandedRows([]);
    }, [filter]);

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

    const reportColumns: ColumnsType<ReportCategoryDetails> = [
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

                <Row gutter={16}>
                    <Col span={8}>
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
                    <Col span={8}>
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
                    <Col span={8}>
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
