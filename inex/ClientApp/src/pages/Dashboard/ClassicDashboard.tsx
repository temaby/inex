import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, Spin } from "antd";
import dayjs from "dayjs";
import { ArrowDown, ArrowUp, ChevronLeft, Layers3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InExButton, Num, SegmentedControl } from "../../components/primitives";
import BasicPage from "../../layouts/BasicPage";
import type { DashboardCategoryMode, DashboardCategorySlice, DashboardFlow } from "./dashboard-utils";
import type { DashboardData } from "./useDashboardData";
import "./dashboard.css";

export const DASHBOARD_INCOME_COLORS = [
    "#147D64",
    "#2478D0",
    "#00A6A6",
    "#6D5BD0",
    "#2E9B46",
    "#3F51B5",
    "#0088CC",
    "#5B8C00",
    "#546E7A",
];

export const DASHBOARD_EXPENSE_COLORS = [
    "#C53D43",
    "#E76F51",
    "#D97706",
    "#C0266D",
    "#A63A50",
    "#F59E0B",
    "#E4572E",
    "#9F2B68",
    "#B45309",
];

interface CategoryPanelProps {
    currency: string;
    flow: DashboardFlow;
    isError: boolean;
    isLoading: boolean;
    isUnavailable: boolean;
    locale: string;
    missingRates: string[];
    mode: DashboardCategoryMode;
    selectedParentName?: string;
    slices: DashboardCategorySlice[];
    onBack: () => void;
    onRetry: () => void;
    onSelect: (slice: DashboardCategorySlice) => void;
}

const CategoryPanel = ({
    currency,
    flow,
    isError,
    isLoading,
    isUnavailable,
    locale,
    missingRates,
    mode,
    selectedParentName,
    slices,
    onBack,
    onRetry,
    onSelect,
}: CategoryPanelProps) => {
    const { t } = useTranslation();
    const [otherExpanded, setOtherExpanded] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const lastParentButtonRef = useRef<HTMLButtonElement | null>(null);
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    const colors = flow === "income" ? DASHBOARD_INCOME_COLORS : DASHBOARD_EXPENSE_COLORS;

    useEffect(() => {
        setOtherExpanded(false);
    }, [mode, selectedParentName, slices]);

    useEffect(() => {
        if (selectedParentName) headingRef.current?.focus();
    }, [selectedParentName]);

    const returnToParents = () => {
        onBack();
        window.requestAnimationFrame(() => lastParentButtonRef.current?.focus());
    };

    return (
        <section
            className={`dashboard-panel dashboard-category-panel dashboard-category-panel--${flow}`}
            data-qa={`dashboard-${flow}-categories`}
            onKeyDown={(event) => {
                if (event.key === "Escape" && selectedParentName) {
                    event.preventDefault();
                    returnToParents();
                }
            }}
        >
            <div className="dashboard-panel__header">
                <div>
                    <span className="dashboard-panel__eyebrow">{t("dashboard.categories.eyebrow")}</span>
                    <h2 className="dashboard-panel__title" ref={headingRef} tabIndex={-1}>{t(`dashboard.categories.${flow}Title`)}</h2>
                    <p className="dashboard-panel__context">
                        {selectedParentName
                            ? t("dashboard.categories.childrenOf", { category: selectedParentName })
                            : t(`dashboard.categories.${mode}Context`)}
                    </p>
                </div>
                <Layers3 size={18} aria-hidden="true" />
            </div>

            {selectedParentName && (
                <InExButton icon={<ChevronLeft size={15} />} kind="ghost" onClick={returnToParents} size="sm">
                    {t("dashboard.categories.backToParents")}
                </InExButton>
            )}

            <Spin spinning={isLoading} tip={t("dashboard.categories.loading")}>
                {isError ? (
                    <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                        {t("dashboard.categories.error")}
                    </div>
                ) : isUnavailable ? (
                    <div className="dashboard-panel-state" role="status">
                        <strong>{t("dashboard.unavailable.title")}</strong>
                        <span>{t("dashboard.unavailable.rates", { currencies: missingRates.join(", ") })}</span>
                        <InExButton kind="ghost" onClick={onRetry} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                    </div>
                ) : slices.length === 0 ? (
                    <div className="dashboard-panel-state" role="status">
                        {t(`dashboard.categories.${flow}Empty`)}
                    </div>
                ) : (
                    <div className="dashboard-donut-layout">
                        <div className="dashboard-donut" aria-hidden="true">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={slices}
                                        dataKey="amount"
                                        innerRadius="58%"
                                        nameKey="label"
                                        outerRadius="84%"
                                        paddingAngle={2}
                                        stroke="var(--bg-surface)"
                                        strokeWidth={2}
                                    >
                                        {slices.map((slice, index) => (
                                            <Cell fill={colors[index % colors.length]} key={slice.key} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [
                                            new Intl.NumberFormat(locale, {
                                                style: "currency",
                                                currency: currency || "USD",
                                                maximumFractionDigits: 2,
                                            }).format(Number(value)),
                                            t("dashboard.categories.amount"),
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="dashboard-donut__total">
                                <strong>{slices.length}</strong>
                                <span>{t("dashboard.categories.visible")}</span>
                            </div>
                        </div>

                        <ol className="dashboard-chart-legend" aria-label={t(`dashboard.categories.${flow}Summary`)}>
                            {slices.map((slice, index) => {
                                const percentage = total > 0 ? (slice.amount / total) * 100 : 0;
                                const action = slice.isOther
                                    ? () => setOtherExpanded((value) => !value)
                                    : () => onSelect(slice);
                                return (
                                    <li key={slice.key}>
                                        <button
                                            aria-expanded={slice.isOther ? otherExpanded : undefined}
                                            className="dashboard-chart-legend__button"
                                            onClick={(event) => {
                                                if (!slice.isOther && mode === "parent" && !selectedParentName) {
                                                    lastParentButtonRef.current = event.currentTarget;
                                                }
                                                action();
                                            }}
                                            type="button"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="dashboard-chart-legend__swatch"
                                                style={{ background: colors[index % colors.length] }}
                                            />
                                            <span className="dashboard-chart-legend__label">{slice.label}</span>
                                            <span className="dashboard-chart-legend__percentage">{percentage.toFixed(0)}%</span>
                                            <Num
                                                currency={currency}
                                                currencySize="sm"
                                                kind={flow}
                                                locale={locale}
                                                value={flow === "expense" ? -slice.amount : slice.amount}
                                            />
                                        </button>
                                        {slice.isOther && otherExpanded && slice.members && (
                                            <ol className="dashboard-other-list">
                                                {slice.members.map((member) => (
                                                    <li key={member.key}>
                                                        <button onClick={() => onSelect(member)} type="button">
                                                            <span>{member.label}</span>
                                                            <Num
                                                                currency={currency}
                                                                currencySize="sm"
                                                                kind={flow}
                                                                locale={locale}
                                                                value={flow === "expense" ? -member.amount : member.amount}
                                                            />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}
            </Spin>
        </section>
    );
};

const ClassicDashboard = ({ data }: { data: DashboardData }) => {
    const { t, i18n, navigate, selectedLinkedUserId, selectedLinkedAccount, visibleAccounts, accountBalances, baseCurrency, accountConversion, balancePanelLoading, balancePanelError, accountDataLoading, accountDataError, categoryPanelLoading, categoriesQuery, categoryTransactionsQuery, summaryQuery, ratesLoading, missingCashFlowRates, cashFlowConversion, hasCashFlow, cashFlowChartData, oneSidedCashFlow, formatMoney, openFlow, categoryMode, setCategoryMode, expenseParentName, incomeParentName, expenseSlices, incomeSlices, setExpenseParentId, setIncomeParentId, selectCategory, categoryConversion, retryRates, effectiveDate, currentPeriodLabel, accountsExpanded, setAccountsExpanded, accountListId, hasCollapsibleAccounts, hasDesktopCollapsibleAccounts } = data;
    return (
        <BasicPage
            extra={<InExButton kind="primary" onClick={() => navigate("/transactions?create=true")}>{t("dashboard.addTransaction")}</InExButton>}
            frame="analytics"
            title={t("dashboard.title")}
            subtitle={t("dashboard.subtitle")}
        >
            <div className="dashboard-workspace">
                {selectedLinkedUserId !== null ? (
                    <Alert
                        message={t("linkedAccount.readOnly", { username: selectedLinkedAccount?.username ?? "" })}
                        showIcon
                        type="info"
                    />
                ) : null}

                <div className="dashboard-grid">
                    <section className="dashboard-panel dashboard-position-panel" data-qa="dashboard-position">
                    <div className="dashboard-position-panel__balance" data-qa="dashboard-balance">
                        <div className="dashboard-panel__header">
                            <h2 className="dashboard-panel__title">{t("dashboard.balance.title")}</h2>
                        </div>
                        <Spin spinning={balancePanelLoading} tip={t("dashboard.balance.loading")}>
                            {balancePanelError ? (
                                <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                    {t("dashboard.balance.error")}
                                </div>
                            ) : visibleAccounts.length === 0 ? (
                                <div className="dashboard-panel-state" role="status">
                                    <span>{t("dashboard.balance.empty")}</span>
                                    <Link to="/accounts">{t("dashboard.balance.manageAccounts")}</Link>
                                </div>
                            ) : accountConversion.isComplete ? (
                                <div className="dashboard-balance-total">
                                    <Num
                                        accessibleLabel={t("dashboard.balance.amountLabel")}
                                        currency={baseCurrency}
                                        kind={accountConversion.value < 0 ? "expense" : "neutral"}
                                        locale={i18n.language}
                                        signage="negative-only"
                                        value={accountConversion.value}
                                    />
                                    <span>{t("dashboard.balance.metadata", { count: visibleAccounts.length, date: effectiveDate })}</span>
                                </div>
                            ) : (
                                <div className="dashboard-balance-total dashboard-balance-total--unavailable" role="status">
                                    <strong>{t("dashboard.unavailable.short")}</strong>
                                    <span>{t("dashboard.unavailable.rates", {
                                        currencies: accountConversion.unavailableCurrencies
                                            .map((currency) => `${currency} (${dayjs().format("YYYY-MM-DD")})`)
                                            .join(", "),
                                    })}</span>
                                    <InExButton kind="ghost" onClick={retryRates} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                                </div>
                            )}
                        </Spin>
                    </div>

                    <div className="dashboard-position-panel__accounts" data-qa="dashboard-accounts">
                        <div className="dashboard-panel__header">
                            <h3 className="dashboard-position-panel__accounts-title">{t("dashboard.accounts.title")}</h3>
                            <Link to="/accounts">{t("dashboard.accounts.open")}</Link>
                        </div>
                        <Spin spinning={accountDataLoading} tip={t("dashboard.balance.loading")}>
                            {accountDataError ? (
                                <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                    {t("dashboard.balance.error")}
                                </div>
                            ) : accountBalances.length === 0 ? (
                                <div className="dashboard-panel-state" role="status">{t("dashboard.balance.empty")}</div>
                            ) : (
                                <>
                                <ul
                                    className={`dashboard-account-list${accountsExpanded ? " dashboard-account-list--expanded" : ""}`}
                                    id={accountListId}
                                >
                                    {accountBalances.map((account, index) => (
                                        <li
                                            className={[
                                                "dashboard-account-list__item",
                                                index >= 3 && account.value >= 0 ? "dashboard-account-list__item--mobile-collapsible" : "",
                                                index >= 5 && account.value >= 0 ? "dashboard-account-list__item--desktop-collapsible" : "",
                                            ].filter(Boolean).join(" ")}
                                            key={account.id}
                                        >
                                            <Link to="/accounts">
                                                <span>{account.name}</span>
                                                <Num
                                                    accessibleLabel={t("dashboard.balance.amountLabel")}
                                                    currency={account.currency}
                                                    kind={account.value < 0 ? "expense" : "neutral"}
                                                    locale={i18n.language}
                                                    signage="negative-only"
                                                    value={account.value}
                                                />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {hasCollapsibleAccounts ? (
                                    <InExButton
                                        aria-controls={accountListId}
                                        aria-expanded={accountsExpanded}
                                        className={`dashboard-account-list__toggle${hasDesktopCollapsibleAccounts ? " dashboard-account-list__toggle--desktop" : ""}`}
                                        kind="ghost"
                                        onClick={() => setAccountsExpanded((value) => !value)}
                                        size="sm"
                                    >
                                        {accountsExpanded ? t("dashboard.accounts.showLess") : t("dashboard.accounts.showAll", { count: accountBalances.length })}
                                    </InExButton>
                                ) : null}
                                </>
                            )}
                        </Spin>
                    </div>
                    </section>

                    <section className="dashboard-panel dashboard-cash-flow-panel" data-qa="dashboard-cash-flow">
                    <div className="dashboard-panel__header dashboard-panel__header--compact">
                        <h2 className="dashboard-panel__title">{t("dashboard.cashFlow.title")}</h2>
                        <p className="dashboard-panel__context">{t("dashboard.cashFlow.period", { period: currentPeriodLabel })}</p>
                    </div>
                    <Spin spinning={summaryQuery.isLoading || ratesLoading} tip={t("dashboard.cashFlow.loading")}>
                        {summaryQuery.isError ? (
                            <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                {t("dashboard.cashFlow.error")}
                            </div>
                        ) : cashFlowConversion && !cashFlowConversion.isComplete && !ratesLoading ? (
                            <div className="dashboard-panel-state" role="status">
                                <strong>{t("dashboard.unavailable.title")}</strong>
                                <span>{t("dashboard.unavailable.rates", { currencies: missingCashFlowRates.join(", ") })}</span>
                                <InExButton kind="ghost" onClick={retryRates} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                            </div>
                        ) : !hasCashFlow ? (
                            <div className="dashboard-panel-state" role="status">
                                <strong>{t("dashboard.cashFlow.noActivity")}</strong>
                                <span>{t("dashboard.cashFlow.noActivityHint")}</span>
                                {selectedLinkedUserId === null ? (
                                    <InExButton kind="primary" onClick={() => navigate("/transactions?create=true")} size="sm">
                                        {t("dashboard.addTransaction")}
                                    </InExButton>
                                ) : null}
                            </div>
                        ) : (
                            <div className="dashboard-cash-flow-layout">
                                <div className="dashboard-cash-flow-summary" aria-label={t("dashboard.cashFlow.summaryTitle")}>
                                    {cashFlowChartData.map((item) => (
                                        <button key={item.key} onClick={() => openFlow(item.key as DashboardFlow)} type="button">
                                            <span>
                                                {item.key === "income" ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
                                                {item.label}
                                            </span>
                                            <span>
                                                <Num
                                                    currency={baseCurrency}
                                                    kind={item.key as DashboardFlow}
                                                    locale={i18n.language}
                                                    value={item.key === "expense" ? -item.value : item.value}
                                                />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {oneSidedCashFlow ? <p className="dashboard-cash-flow-note">{oneSidedCashFlow}</p> : null}
                                <div className="dashboard-cash-flow-chart" aria-hidden="true">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cashFlowChartData} margin={{ top: 16, right: 12, bottom: 8, left: 12 }}>
                                            <CartesianGrid stroke="var(--border-1)" vertical={false} />
                                            <XAxis axisLine={false} dataKey="label" tickLine={false} />
                                            <YAxis axisLine={false} tickFormatter={(value) => formatMoney(Number(value))} tickLine={false} width={86} />
                                            <Tooltip formatter={(value) => [formatMoney(Number(value)), t("dashboard.categories.amount")]} />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {cashFlowChartData.map((item) => <Cell fill={item.fill} key={item.key} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </Spin>
                    </section>

                    <div className="dashboard-category-toolbar">
                    <div>
                        <span className="dashboard-panel__eyebrow">{t("dashboard.categories.sectionEyebrow")}</span>
                        <h2>{t("dashboard.categories.sectionTitle")}</h2>
                    </div>
                    <SegmentedControl
                        label={t("dashboard.categories.level")}
                        onChange={(value) => setCategoryMode(value as DashboardCategoryMode)}
                        options={[
                            { key: "parent", label: t("dashboard.categories.parent") },
                            { key: "child", label: t("dashboard.categories.child") },
                        ]}
                        size="compact"
                        value={categoryMode}
                    />
                    </div>

                    <CategoryPanel
                    currency={baseCurrency}
                    flow="expense"
                    isError={categoriesQuery.isError || categoryTransactionsQuery.isError || (!baseCurrency && summaryQuery.isError)}
                    isLoading={categoryPanelLoading}
                    isUnavailable={categoryConversion.expenseMissingRates.length > 0 && !ratesLoading}
                    locale={i18n.language}
                    missingRates={categoryConversion.expenseMissingRates}
                    mode={categoryMode}
                    onBack={() => setExpenseParentId(null)}
                    onRetry={retryRates}
                    onSelect={(slice) => selectCategory("expense", slice)}
                    selectedParentName={expenseParentName}
                    slices={expenseSlices}
                    />
                    <CategoryPanel
                    currency={baseCurrency}
                    flow="income"
                    isError={categoriesQuery.isError || categoryTransactionsQuery.isError || (!baseCurrency && summaryQuery.isError)}
                    isLoading={categoryPanelLoading}
                    isUnavailable={categoryConversion.incomeMissingRates.length > 0 && !ratesLoading}
                    locale={i18n.language}
                    missingRates={categoryConversion.incomeMissingRates}
                    mode={categoryMode}
                    onBack={() => setIncomeParentId(null)}
                    onRetry={retryRates}
                    onSelect={(slice) => selectCategory("income", slice)}
                    selectedParentName={incomeParentName}
                    slices={incomeSlices}
                    />
                </div>
            </div>
        </BasicPage>
    );
};


export default ClassicDashboard;
