import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Col, Row, Spin, Statistic, Typography } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, BankOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import BasicPage from "../layouts/BasicPage";
import SpendingHeatmap from "../components/SpendingHeatmap";
import type { BudgetReportResponse, ReportMetadataDTO } from "../model/Report/BudgetReport";
import type { NetWorthHistoryPoint, NetWorthHistoryResponse } from "../model/Report/NetWorthHistory";
import { useAppSelector } from "../store/hooks";
import apiClient from "../utils/apiClient";

interface Currency {
    id: number;
    key: string;
    name: string;
}

interface MonthTotals {
    income: number;
    expenses: number;
    savings: number;
}

interface SummaryState {
    current: MonthTotals;
    previous: MonthTotals | null;
}

type TrendMode = "higherIsBetter" | "lowerIsBetter";

const emptyTotals: MonthTotals = {
    income: 0,
    expenses: 0,
    savings: 0,
};

const totalsFromMetadata = (metadata?: ReportMetadataDTO | null): MonthTotals => {
    const income = metadata?.totalIncome ?? 0;
    const expenses = metadata?.totalOutcome ?? 0;
    const savings = income - expenses;

    return {
        income,
        expenses,
        savings: Math.abs(savings) < 0.01 ? 0 : savings,
    };
};

const getDeltaPercent = (current: number, previous: number | null | undefined) => {
    if (!previous) return null;

    return ((current - previous) / Math.abs(previous)) * 100;
};

const getDeltaColor = (delta: number | null, mode: TrendMode) => {
    if (delta === null || Math.abs(delta) < 0.01) return undefined;

    const isPositiveTrend = mode === "higherIsBetter" ? delta > 0 : delta < 0;
    return isPositiveTrend ? "green" : "red";
};

const Dashboard = () => {
    const { t } = useTranslation();
    const user = useAppSelector((state) => state.auth.user);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [summary, setSummary] = useState<SummaryState>({ current: emptyTotals, previous: null });
    const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistoryPoint[]>([]);
    const [isLoadingCurrency, setIsLoadingCurrency] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isLoadingNetWorth, setIsLoadingNetWorth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [netWorthError, setNetWorthError] = useState<string | null>(null);

    const currency = useMemo(() => {
        if (!user) return null;
        return currencies.find((item) => item.id === user.currencyId)?.key ?? null;
    }, [currencies, user]);

    useEffect(() => {
        let isMounted = true;

        setIsLoadingCurrency(true);
        apiClient.get<Currency[]>("/currencies")
            .then(({ data }) => {
                if (isMounted) setCurrencies(data);
            })
            .catch(() => {
                if (isMounted) setError(t("dashboard.summary.error"));
            })
            .finally(() => {
                if (isMounted) setIsLoadingCurrency(false);
            });

        return () => {
            isMounted = false;
        };
    }, [t]);

    useEffect(() => {
        if (user && !isLoadingCurrency && currencies.length > 0 && !currency) {
            setError(t("dashboard.summary.currencyUnavailable"));
        }
    }, [currencies.length, currency, isLoadingCurrency, t, user]);

    useEffect(() => {
        if (!currency) return;

        let isMounted = true;
        const currentMonth = dayjs();
        const previousMonth = currentMonth.subtract(1, "month");
        const getReportUrl = (month: dayjs.Dayjs) => {
            const params = new URLSearchParams({
                year: String(month.year()),
                month: String(month.month() + 1),
                currency,
            });

            return `/reports/budget/comparison?${params.toString()}`;
        };

        setIsLoadingSummary(true);
        setError(null);

        Promise.all([
            apiClient.get<BudgetReportResponse>(getReportUrl(currentMonth)),
            apiClient.get<BudgetReportResponse>(getReportUrl(previousMonth)),
        ])
            .then(([currentResponse, previousResponse]) => {
                if (!isMounted) return;

                setSummary({
                    current: totalsFromMetadata(currentResponse.data.metadata),
                    previous: totalsFromMetadata(previousResponse.data.metadata),
                });
            })
            .catch(() => {
                if (!isMounted) return;

                setSummary({ current: emptyTotals, previous: null });
                setError(t("dashboard.summary.error"));
            })
            .finally(() => {
                if (isMounted) setIsLoadingSummary(false);
            });

        return () => {
            isMounted = false;
        };
    }, [currency, t]);

    useEffect(() => {
        if (!currency) return;

        let isMounted = true;
        const params = new URLSearchParams({ months: "12" });

        setIsLoadingNetWorth(true);
        setNetWorthError(null);

        apiClient.get<NetWorthHistoryResponse>(`/reports/net-worth?${params.toString()}`)
            .then(({ data }) => {
                if (!isMounted) return;
                setNetWorthHistory(data.data);
            })
            .catch(() => {
                if (!isMounted) return;
                setNetWorthHistory([]);
                setNetWorthError(t("dashboard.netWorth.error"));
            })
            .finally(() => {
                if (isMounted) setIsLoadingNetWorth(false);
            });

        return () => {
            isMounted = false;
        };
    }, [currency, t]);

    const isLoading = isLoadingCurrency || isLoadingSummary;
    const hasNoCurrentMonthActivity = summary.current.income === 0 && summary.current.expenses === 0;
    const chartCurrency = netWorthHistory[0]?.currency ?? currency ?? "";
    const locale = user?.languageCode || undefined;

    const formatMoney = (value: number, maximumFractionDigits = 0) => (
        new Intl.NumberFormat(locale, {
            style: "currency",
            currency: chartCurrency || "USD",
            maximumFractionDigits,
        }).format(value)
    );

    const formatMonth = (month: string) => {
        const date = dayjs(`${month}-01`);
        return date.isValid()
            ? date.toDate().toLocaleDateString(locale, { month: "short", year: "numeric" })
            : month;
    };

    const netWorthChartData = netWorthHistory.map((point) => ({
        ...point,
        monthLabel: formatMonth(point.month),
    }));
    const currentMonthRange = useMemo(() => {
        const month = dayjs();
        return {
            start: month.startOf("month"),
            end: month.endOf("month"),
        };
    }, []);

    const cards = [
        {
            key: "income",
            title: t("dashboard.summary.totalIncome"),
            value: summary.current.income,
            previous: summary.previous?.income,
            icon: <ArrowUpOutlined />,
            valueColor: "green",
            trendMode: "higherIsBetter" as const,
        },
        {
            key: "expenses",
            title: t("dashboard.summary.totalExpenses"),
            value: summary.current.expenses,
            previous: summary.previous?.expenses,
            icon: <ArrowDownOutlined />,
            valueColor: "red",
            trendMode: "lowerIsBetter" as const,
        },
        {
            key: "savings",
            title: t("dashboard.summary.netSavings"),
            value: summary.current.savings,
            previous: summary.previous?.savings,
            icon: <BankOutlined />,
            valueColor: summary.current.savings >= 0 ? "green" : "red",
            trendMode: "higherIsBetter" as const,
        },
    ];

    return (
        <BasicPage title={t("dashboard.title")}>
            <div style={{ minHeight: "76vh", background: "white", padding: 24 }}>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 24, maxWidth: 720 }}>
                    {t("dashboard.description")}
                </Typography.Paragraph>

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message={error}
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Spin spinning={isLoading} tip={t("dashboard.summary.loading")}>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                        {cards.map((card) => {
                            const delta = getDeltaPercent(card.value, card.previous);
                            const deltaColor = hasNoCurrentMonthActivity ? undefined : getDeltaColor(delta, card.trendMode);
                            const deltaText = hasNoCurrentMonthActivity
                                ? t("dashboard.summary.noCurrentMonthData")
                                : delta === null
                                ? t("dashboard.summary.noPreviousMonth")
                                : t("dashboard.summary.vsLastMonth", {
                                    value: `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`,
                                });

                            return (
                                <Col key={card.key} xs={24} lg={8}>
                                    <Card style={{ height: "100%" }}>
                                        <Statistic
                                            title={card.title}
                                            value={card.value}
                                            precision={2}
                                            suffix={currency ?? ""}
                                            valueStyle={hasNoCurrentMonthActivity ? undefined : { color: card.valueColor }}
                                            prefix={card.icon}
                                        />
                                        <Typography.Text
                                            type={deltaColor ? undefined : "secondary"}
                                            style={{ color: deltaColor, display: "block", marginTop: 8 }}
                                        >
                                            {deltaText}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                                            {t("dashboard.summary.currentMonth")}
                                        </Typography.Text>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Spin>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card
                            title={t("reports.heatmapReport")}
                            style={{ height: "100%" }}
                            styles={{ body: { minHeight: 300, padding: 0 } }}
                        >
                            <SpendingHeatmap
                                start={currentMonthRange.start}
                                end={currentMonthRange.end}
                                height={210}
                                minWidth={360}
                                padding={0}
                                showRange={false}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card
                            title={t("dashboard.netWorth.title")}
                            style={{ height: "100%" }}
                            styles={{ body: { minHeight: 300 } }}
                        >
                            {netWorthError && (
                                <Alert
                                    type="error"
                                    showIcon
                                    message={netWorthError}
                                    style={{ marginBottom: 16 }}
                                />
                            )}
                            <Spin spinning={isLoadingNetWorth} tip={t("dashboard.netWorth.loading")}>
                                {!isLoadingNetWorth && netWorthChartData.length === 0 && !netWorthError ? (
                                    <Typography.Text type="secondary">
                                        {t("dashboard.netWorth.empty")}
                                    </Typography.Text>
                                ) : (
                                    <div style={{ height: 260, width: "100%" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={netWorthChartData}
                                                margin={{ top: 12, right: 16, bottom: 12, left: 16 }}
                                            >
                                                <CartesianGrid stroke="#f0f0f0" />
                                                <XAxis
                                                    dataKey="monthLabel"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    minTickGap={16}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => formatMoney(Number(value))}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    width={88}
                                                />
                                                <Tooltip
                                                    labelFormatter={(_, payload) => {
                                                        const point = payload?.[0]?.payload as NetWorthHistoryPoint | undefined;
                                                        return point ? formatMonth(point.month) : "";
                                                    }}
                                                    formatter={(value) => [
                                                        formatMoney(Number(value), 2),
                                                        t("dashboard.netWorth.valueLabel"),
                                                    ]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="netWorth"
                                                    name={t("dashboard.netWorth.valueLabel")}
                                                    stroke="#1677ff"
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                    activeDot={{ r: 5 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </Spin>
                        </Card>
                    </Col>
                </Row>
            </div>
        </BasicPage>
    );
};

export default Dashboard;
