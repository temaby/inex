import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useNavigate } from "react-router-dom";
import { Alert, Layout, Card, Row, Col, Statistic, Progress, Spin, Table, Tabs, Space, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { DatePicker } from "antd";

import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";
import { useGetBudgetReportQuery } from "../../store/budgetReport/budgetReport-api";
import { budgetReportActions } from "../../store/budgetReport/budgetReport-slice";

const { Title } = Typography;

const ReportBudgetSpending: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currency = useAppSelector(state => state.report.currency) || "USD";
    const { selectedYear, selectedMonth } = useAppSelector(state => state.budgetReport);

    const [localDate, setLocalDate] = useState(dayjs(`${selectedYear}-${selectedMonth}`, "YYYY-M"));
    const { data, isError, isLoading } = useGetBudgetReportQuery({
        year: localDate.year(),
        month: localDate.month() + 1,
        currency,
    });
    const items = data?.data ?? [];
    const metadata = data?.metadata;

    const handleDateChange = (date: any) => {
        if (date) {
            setLocalDate(date);
        }
    };

    useEffect(() => {
        dispatch(budgetReportActions.setPeriod({
            year: localDate.year(),
            month: localDate.month() + 1,
        }));
    }, [dispatch, localDate]);

    const totalBudget = items.reduce((sum: number, item: BudgetComparisonDTO) => sum + item.budgetedAmount, 0);
    const totalSpent = items.reduce((sum: number, item: BudgetComparisonDTO) => sum + item.spentAmount, 0);

    let totalRemaining = totalBudget - totalSpent;
    if (Math.abs(totalRemaining) < 0.01) totalRemaining = 0;

    const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const realIncome = metadata?.totalIncome || 0;
    const realOutcome = metadata?.totalOutcome || 0;

    let unbudgetedSpending = realOutcome - totalSpent;
    if (Math.abs(unbudgetedSpending) < 0.01) unbudgetedSpending = 0;

    let balance = realIncome - realOutcome;
    if (Math.abs(balance) < 0.01) balance = 0;

    const columns = [
        {
            title: t("reports.category"),
            dataIndex: "categoryName",
            key: "categoryName",
        },
        {
            title: t("reports.budget"),
            dataIndex: "budgetedAmount",
            key: "budgetedAmount",
            render: (val: number) => `${val.toFixed(2)} ${currency}`,
        },
        {
            title: t("reports.spent"),
            dataIndex: "spentAmount",
            key: "spentAmount",
            render: (val: number) => `${val.toFixed(2)} ${currency}`,
        },
        {
            title: t("reports.progress"),
            dataIndex: "percentageUsed",
            key: "percentageUsed",
            render: (val: number) => {
                let color = "#52c41a";
                if (val > 110) {
                    color = "#ff4d4f";
                } else if (val > 100) {
                    color = "#faad14";
                }

                return (
                    <Progress
                        percent={Math.min(val, 100)}
                        strokeColor={color}
                        format={() => <span style={{ color: color }}>{val.toFixed(0)}%</span>}
                    />
                );
            },
        },
        {
            title: t("reports.remaining"),
            dataIndex: "remainingAmount",
            key: "remainingAmount",
            render: (val: number) => (
                <span style={{ color: val >= 0 ? "green" : "red" }}>
                    {val.toFixed(2)} {currency}
                </span>
            ),
        },
    ];

    return (
        <div style={{ padding: "20px" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Space>
                    <Title level={4}>{t("reports.interval")}</Title>
                    <DatePicker
                        picker="month"
                        value={localDate}
                        onChange={handleDateChange}
                        allowClear={false}
                        bordered={true}
                        inputReadOnly={true}
                    />
                </Space>

                {isError && (
                    <Alert
                        type="error"
                        message={t("reports.budgetReportError")}
                    />
                )}

                <Spin spinning={isLoading}>
                    <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title={t("reports.totalIncome")}
                                    value={realIncome}
                                    precision={2}
                                    suffix={currency}
                                    valueStyle={{ color: "green" }}
                                    prefix={<ArrowUpOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title={t("reports.totalExpense")}
                                    value={realOutcome}
                                    precision={2}
                                    suffix={currency}
                                    valueStyle={{ color: "red" }}
                                    prefix={<ArrowDownOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title={t("reports.unbudgeted")}
                                    value={unbudgetedSpending}
                                    precision={2}
                                    suffix={currency}
                                    valueStyle={{ color: unbudgetedSpending > 0 ? "orange" : "gray" }}
                                    prefix={<WarningOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title={t("reports.savings")}
                                    value={balance}
                                    precision={2}
                                    suffix={currency}
                                    valueStyle={{ color: balance >= 0 ? "green" : "red" }}
                                    prefix={<BankOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic title={t("reports.totalBudget")} value={totalBudget} precision={2} suffix={currency} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic title={t("reports.budgetSpent")} value={totalSpent} precision={2} suffix={currency} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic title={t("reports.used")} value={totalPercent} precision={1} suffix="%" />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title={t("reports.budgetRemaining")}
                                    value={totalRemaining}
                                    precision={2}
                                    suffix={currency}
                                    valueStyle={{ color: totalRemaining >= 0 ? "green" : "red" }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Table
                        dataSource={items}
                        columns={columns}
                        rowKey="categoryName"
                        pagination={false}
                        onRow={(record) => {
                            return {
                                onClick: () => {
                                    if (record.categoryIds && record.categoryIds.length > 0) {
                                        const start = localDate.startOf('month').format('YYYY-MM-DD');
                                        const end = localDate.endOf('month').format('YYYY-MM-DD');
                                        navigate(`/transactions?filter=categoryIds:${record.categoryIds.join(",")};start:${start};end:${end}`);
                                    }
                                },
                                style: { cursor: "pointer" }
                            };
                        }}
                    />
                </Spin>
            </Space>
        </div>
    );
};

export default ReportBudgetSpending;
