import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useNavigate } from "react-router-dom";
import { Layout, DatePicker, Card, Row, Col, Statistic, Progress, Spin, Table, Tabs, Space, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined, WarningOutlined } from '@ant-design/icons';
import moment from "moment";
import "moment/locale/ru";
import locale from "antd/es/date-picker/locale/ru_RU";

import { fetchBudgetReport } from "../../store/budgetReport/budgetReport-actions";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";

const { Title } = Typography;

const ReportBudgetSpending: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { items, isLoading, selectedYear, selectedMonth, error, metadata } = useAppSelector(state => state.budgetReport);
    const currency = useAppSelector(state => state.report.currency) || "USD";

    const [localDate, setLocalDate] = useState(moment(`${selectedYear}-${selectedMonth}`, "YYYY-M"));

    useEffect(() => {
        dispatch(fetchBudgetReport(localDate.year(), localDate.month() + 1, currency));
    }, [localDate, currency, dispatch]);

    const handleDateChange = (date: any) => {
        if (date) {
            setLocalDate(date);
        }
    };

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
            title: "Категория",
            dataIndex: "categoryName",
            key: "categoryName",
        },
        {
            title: "Бюджет",
            dataIndex: "budgetedAmount",
            key: "budgetedAmount",
            render: (val: number) => `${val.toFixed(2)} ${currency}`,
        },
        {
            title: "Потрачено",
            dataIndex: "spentAmount",
            key: "spentAmount",
            render: (val: number) => `${val.toFixed(2)} ${currency}`,
        },
        {
            title: "Прогресс",
            dataIndex: "percentageUsed",
            key: "percentageUsed",
            render: (val: number) => {
                let color = "#52c41a"; // Green (Good)
                if (val > 110) {
                    color = "#ff4d4f"; // Red (Critical - >10% over)
                } else if (val > 100) {
                    color = "#faad14"; // Orange (Warning - 0-10% over)
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
            title: "Остаток",
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
                    <Title level={4}>Интервал</Title>
                    <DatePicker
                        picker="month"
                        value={localDate}
                        onChange={handleDateChange}
                        locale={locale}
                        allowClear={false}
                        bordered={true}
                        inputReadOnly={true}
                    />
                </Space>

                <Spin spinning={isLoading}>
                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                        <Col span={6}>
                            <Card>
                                <Statistic 
                                    title="Общий доход" 
                                    value={realIncome} 
                                    precision={2} 
                                    suffix={currency} 
                                    valueStyle={{ color: "green" }} 
                                    prefix={<ArrowUpOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic 
                                    title="Общий расход" 
                                    value={realOutcome} 
                                    precision={2} 
                                    suffix={currency} 
                                    valueStyle={{ color: "red" }} 
                                    prefix={<ArrowDownOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic 
                                    title="Вне бюджета" 
                                    value={unbudgetedSpending} 
                                    precision={2} 
                                    suffix={currency} 
                                    valueStyle={{ color: unbudgetedSpending > 0 ? "orange" : "gray" }} 
                                    prefix={<WarningOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic 
                                    title="Накопления" 
                                    value={balance} 
                                    precision={2} 
                                    suffix={currency} 
                                    valueStyle={{ color: balance >= 0 ? "green" : "red" }} 
                                    prefix={<BankOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Общий бюджет" value={totalBudget} precision={2} suffix={currency} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Бюджетные траты" value={totalSpent} precision={2} suffix={currency} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Использовано" value={totalPercent} precision={1} suffix="%" />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Остаток бюджета"
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
                                        const start = localDate.clone().startOf('month').format('YYYY-MM-DD');
                                        const end = localDate.clone().endOf('month').format('YYYY-MM-DD');
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
