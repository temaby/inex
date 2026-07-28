import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import { ArrowDown, ArrowUp, Banknote, Landmark, TrendingUp } from "lucide-react";
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
import { Num, type MoneyKind } from "../components/primitives";
import type { BudgetComparisonDTO, BudgetReportResponse, ReportMetadataDTO } from "../model/Report/BudgetReport";
import type { NetWorthHistoryPoint, NetWorthHistoryResponse } from "../model/Report/NetWorthHistory";
import { useAppSelector } from "../store/hooks";
import apiClient from "../utils/apiClient";
import "./Dashboard/dashboard.css";

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

interface BudgetMetrics {
    budgeted: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
}

type TrendMode = "higherIsBetter" | "lowerIsBetter";

interface SummaryCard {
    key: string;
    title: string;
    value: number;
    previous?: number;
    icon: React.ReactNode;
    kind: MoneyKind;
    trendMode: TrendMode;
    customDelta?: string;
}

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

const budgetMetricsFromReport = (report?: BudgetReportResponse | null): BudgetMetrics => {
    const totals = (report?.data ?? []).reduce(
        (accumulator, item) => ({
            budgeted: accumulator.budgeted + item.budgetedAmount,
            spent: accumulator.spent + item.spentAmount,
            remaining: accumulator.remaining + item.remainingAmount,
        }),
        { budgeted: 0, spent: 0, remaining: 0 },
    );

    return {
        ...totals,
        percentageUsed: totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0,
    };
};

const getDeltaPercent = (current: number, previous: number | null | undefined) => {
    if (previous === null || previous === undefined || Math.abs(previous) < 0.01) return null;

    return ((current - previous) / Math.abs(previous)) * 100;
};

const getDeltaColor = (delta: number | null, mode: TrendMode) => {
    if (delta === null || Math.abs(delta) < 0.01) return undefined;

    const isPositiveTrend = mode === "higherIsBetter" ? delta > 0 : delta < 0;
    return isPositiveTrend ? "good" : "bad";
};

const getNetWorthDomain = (points: NetWorthHistoryPoint[]): [number, number] | undefined => {
    if (points.length === 0) return undefined;

    const values = points.map((point) => point.netWorth);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range > 0
        ? Math.max(range * 0.12, 1)
        : Math.max(Math.abs(max) * 0.02, 1);
    const lower = min >= 0 ? Math.max(0, min - padding) : min - padding;
    const upper = max + padding;

    return lower === upper ? [lower - 1, upper + 1] : [lower, upper];
};

const Dashboard = () => {
    const { t } = useTranslation();
    const user = useAppSelector((state) => state.auth.user);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [summary, setSummary] = useState<SummaryState>({ current: emptyTotals, previous: null });
    const [currentBudgetReport, setCurrentBudgetReport] = useState<BudgetReportResponse | null>(null);
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
                setCurrentBudgetReport(currentResponse.data);
            })
            .catch(() => {
                if (!isMounted) return;

                setSummary({ current: emptyTotals, previous: null });
                setCurrentBudgetReport(null);
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
    const netWorthYAxisDomain = useMemo(() => getNetWorthDomain(netWorthHistory), [netWorthHistory]);
    const budgetMetrics = useMemo(() => budgetMetricsFromReport(currentBudgetReport), [currentBudgetReport]);
    const topCategories = useMemo(() => {
        const rows = currentBudgetReport?.data ?? [];
        const rankedRows = rows
            .filter((row) => row.spentAmount > 0)
            .slice()
            .sort((left, right) => right.spentAmount - left.spentAmount)
            .slice(0, 5);
        const maxSpent = Math.max(...rankedRows.map((row) => row.spentAmount), 0);

        return {
            rows: rankedRows,
            maxSpent,
        };
    }, [currentBudgetReport]);

    const cards: SummaryCard[] = [
        {
            key: "income",
            title: t("dashboard.summary.totalIncome"),
            value: summary.current.income,
            previous: summary.previous?.income,
            icon: <ArrowUp size={18} />,
            kind: "income" as const,
            trendMode: "higherIsBetter" as const,
        },
        {
            key: "expenses",
            title: t("dashboard.summary.totalExpenses"),
            value: summary.current.expenses,
            previous: summary.previous?.expenses,
            icon: <ArrowDown size={18} />,
            kind: "expense" as const,
            trendMode: "lowerIsBetter" as const,
        },
        {
            key: "savings",
            title: t("dashboard.summary.netSavings"),
            value: summary.current.savings,
            previous: summary.previous?.savings,
            icon: <Banknote size={18} />,
            kind: summary.current.savings >= 0 ? "income" as const : "expense" as const,
            trendMode: "higherIsBetter" as const,
        },
        {
            key: "budgetRemaining",
            title: t("dashboard.summary.budgetRemaining"),
            value: budgetMetrics.remaining,
            previous: undefined,
            icon: <Landmark size={18} />,
            kind: budgetMetrics.remaining < 0 ? "expense" as const : "income" as const,
            trendMode: "higherIsBetter" as const,
            customDelta: budgetMetrics.budgeted > 0
                ? budgetMetrics.remaining < 0
                    ? t("dashboard.summary.budgetOver", {
                        value: formatMoney(Math.abs(budgetMetrics.remaining), 2),
                    })
                    : t("dashboard.summary.budgetUsed", {
                        value: `${budgetMetrics.percentageUsed.toFixed(0)}%`,
                    })
                : t("dashboard.summary.noBudgetData"),
        },
    ];

    return (
        <BasicPage frame="analytics" title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
            <div className="dashboard-workspace">
                {error && (
                    <div className="dashboard-alert" role="alert">{error}</div>
                )}

                <Spin spinning={isLoading} tip={t("dashboard.summary.loading")}>
                    <div className="dashboard-summary-grid" data-qa="dashboard-top-cards">
                        {cards.map((card) => {
                            const delta = getDeltaPercent(card.value, card.previous);
                            const isExtremeDelta = delta !== null && Math.abs(delta) > 999;
                            const deltaColor = hasNoCurrentMonthActivity || isExtremeDelta
                                ? undefined
                                : getDeltaColor(delta, card.trendMode);
                            const deltaText = card.customDelta ?? (hasNoCurrentMonthActivity
                                ? t("dashboard.summary.noCurrentMonthData")
                                : delta === null
                                ? t("dashboard.summary.noPreviousMonth")
                                : isExtremeDelta
                                ? t("dashboard.summary.baselineTooSmall")
                                : t("dashboard.summary.vsLastMonth", {
                                    value: `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`,
                                }));

                            return (
                                <article className="dashboard-card" data-qa="dashboard-top-card" key={card.key}>
                                    <div className="dashboard-card__top">
                                        <span className="dashboard-card__label" data-qa="dashboard-card-title">{card.title}</span>
                                        <span className="dashboard-card__icon" aria-hidden="true">{card.icon}</span>
                                    </div>
                                    <div className="dashboard-card__value" data-qa="dashboard-card-value">
                                        <Num
                                            value={card.value}
                                            currency={currency ?? ""}
                                            kind={card.kind}
                                            currencyDataQa="dashboard-card-currency"
                                        />
                                    </div>
                                    <span
                                        className={`dashboard-card__delta${deltaColor ? ` is-${deltaColor}` : ""}`}
                                        data-qa="dashboard-card-delta"
                                    >
                                        {deltaText}
                                    </span>
                                </article>
                            );
                        })}
                    </div>
                </Spin>

                <div className="dashboard-panel-grid">
                    <section className="dashboard-panel">
                        <div className="dashboard-panel__header">
                            <div>
                                <span className="dashboard-panel__eyebrow">{t("dashboard.analyticsLabel")}</span>
                                <h2 className="dashboard-panel__title">{t("dashboard.topCategories.title")}</h2>
                            </div>
                            <Banknote size={18} aria-hidden="true" />
                        </div>
                        <Spin spinning={isLoadingSummary} tip={t("dashboard.topCategories.loading")}>
                            {topCategories.rows.length === 0 ? (
                                <p className="dashboard-intro">{t("dashboard.topCategories.empty")}</p>
                            ) : (
                                <ol className="dashboard-category-list" aria-label={t("dashboard.topCategories.summaryTitle")}>
                                    {topCategories.rows.map((category: BudgetComparisonDTO) => {
                                        const share = topCategories.maxSpent > 0
                                            ? Math.max((category.spentAmount / topCategories.maxSpent) * 100, 4)
                                            : 0;

                                        return (
                                            <li className="dashboard-category-row" key={category.categoryName}>
                                                <div className="dashboard-category-row__main">
                                                    <span className="dashboard-category-row__name">{category.categoryName}</span>
                                                    <Num
                                                        value={category.spentAmount}
                                                        currency={currency ?? ""}
                                                        kind="expense"
                                                        currencySize="sm"
                                                    />
                                                </div>
                                                <div className="dashboard-category-row__track" aria-hidden="true">
                                                    <span
                                                        className="dashboard-category-row__bar"
                                                        style={{ width: `${share}%` }}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </Spin>
                    </section>
                    <section className="dashboard-panel">
                        <div className="dashboard-panel__header">
                            <div>
                                <span className="dashboard-panel__eyebrow">{t("dashboard.analyticsLabel")}</span>
                                <h2 className="dashboard-panel__title">{t("dashboard.netWorth.title")}</h2>
                            </div>
                            <TrendingUp size={18} aria-hidden="true" />
                        </div>
                        {netWorthError && (
                            <div className="dashboard-alert" role="alert">{netWorthError}</div>
                        )}
                        <Spin spinning={isLoadingNetWorth} tip={t("dashboard.netWorth.loading")}>
                            {!isLoadingNetWorth && netWorthChartData.length === 0 && !netWorthError ? (
                                <p className="dashboard-intro">{t("dashboard.netWorth.empty")}</p>
                            ) : (
                                <div className="dashboard-chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={netWorthChartData}
                                            margin={{ top: 12, right: 16, bottom: 12, left: 16 }}
                                        >
                                            <CartesianGrid stroke="var(--border-1)" />
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
                                                domain={netWorthYAxisDomain}
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
                                                stroke="var(--income-500)"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Spin>
                    </section>
                </div>
            </div>
        </BasicPage>
    );
};

export default Dashboard;
