import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, Spin } from "antd";
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { InExButton, Num, SegmentedControl } from "../../components/primitives";
import BasicPage from "../../layouts/BasicPage";
import type { DashboardCategorySlice } from "./dashboard-utils";
import type { DashboardData } from "./useDashboardData";
import { IncomeDistribution } from "./IncomeDistribution";
import { VisualAccountDistribution } from "./VisualAccountDistribution";
import { getVisualDashboardFlowTitleKey } from "./visual-dashboard-copy";
import "./visual-dashboard.css";

const EXPENSE_CATEGORY_COLORS = ["#d87366", "#e8a15b", "#9c89ca", "#739fc6", "#d9ac50", "#ce81a0", "#bd79a0", "#8b82bb", "#b98c73"];

const VisualDashboard = ({ data }: { data: DashboardData }) => {
    const {
        t, i18n, navigate, selectedLinkedUserId, selectedLinkedAccount, visibleAccounts, hasReportingAccounts,
        baseCurrency, accountConversion, balancePanelLoading, balancePanelError,
        categoryPanelLoading, categoriesQuery,
        categoryTransactionsQuery, summaryQuery, ratesLoading, missingCashFlowRates,
        cashFlowConversion, hasCashFlow, cashFlowChartData, openFlow, categoryMode,
        setCategoryMode, expenseParentName, expenseAutoExpanded, expenseSlices, setExpenseParentId,
        selectCategory, categoryConversion, retryRates, effectiveDate,
        currentPeriodLabel, accountsQuery, accountBalancesQuery,
    } = data;
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [otherExpanded, setOtherExpanded] = useState(false);
    const expenseHeading = useRef<HTMLHeadingElement>(null);
    const lastParentKey = useRef<string | null>(null);
    const legendRef = useRef<HTMLOListElement>(null);
    const totalExpense = expenseSlices.reduce((sum, slice) => sum + slice.amount, 0);
    const locale = i18n.language;
    const percentage = (value: number) => new Intl.NumberFormat(locale, {
        style: "percent", maximumFractionDigits: 0,
    }).format(value);
    const money = (value: number) => new Intl.NumberFormat(locale, {
        style: "currency", currency: baseCurrency || "USD", maximumFractionDigits: 2,
    }).format(value);

    useEffect(() => {
        setHighlightedCategory(null);
        setOtherExpanded(false);
    }, [categoryMode, expenseParentName, expenseSlices]);

    useEffect(() => {
        if (expenseParentName && !expenseAutoExpanded) expenseHeading.current?.focus();
    }, [expenseParentName, expenseAutoExpanded]);

    const returnToParents = () => {
        setExpenseParentId(null);
        window.requestAnimationFrame(() => {
            const buttons = legendRef.current?.querySelectorAll<HTMLButtonElement>("[data-category-key]");
            (Array.from(buttons ?? []).find((button) => button.dataset.categoryKey === lastParentKey.current)
                ?? (lastParentKey.current == null ? buttons?.[0] : undefined))?.focus();
        });
    };

    const selectExpense = (slice: DashboardCategorySlice, returnFocusKey = slice.key) => {
        if (slice.isOther) {
            setOtherExpanded((current) => !current);
            return;
        }
        if (!expenseParentName && categoryMode === "parent") lastParentKey.current = returnFocusKey;
        selectCategory("expense", slice);
    };

    const scopePending = accountsQuery.isLoading || (accountsQuery.isFetching && !accountsQuery.currentData);
    const categoryPending = scopePending || categoryPanelLoading
        || (categoriesQuery.isFetching && !categoriesQuery.currentData)
        || (categoryTransactionsQuery.isFetching && !categoryTransactionsQuery.currentData);
    const moneyPending = scopePending || balancePanelLoading
        || (accountBalancesQuery.isFetching && !accountBalancesQuery.currentData);
    const moneyError = accountsQuery.isError || accountBalancesQuery.isError
        || (!moneyPending && balancePanelError);
    const flowPending = scopePending || summaryQuery.isLoading || ratesLoading
        || (summaryQuery.isFetching && !summaryQuery.currentData);
    const categoryError = accountsQuery.isError || categoriesQuery.isError || categoryTransactionsQuery.isError || (!baseCurrency && summaryQuery.isError);
    const expenseMissingRates = categoryConversion.expenseMissingRates;
    const flowMaximum = Math.max(...cashFlowChartData.map((item) => item.value), 0);
    // Compare the amounts at the same precision that Num displays to the user.
    const displayedAmount = (value: number) => Number(new Intl.NumberFormat("en", {
        useGrouping: false, maximumFractionDigits: 2,
    }).format(value));
    const monthlyResult = cashFlowConversion?.isComplete
        ? Math.round((displayedAmount(cashFlowConversion.income) - displayedAmount(Math.abs(cashFlowConversion.expense))) * 100) / 100
        : 0;
    const resultKey = !hasCashFlow ? "resultNoActivity" : monthlyResult > 0 ? "resultPositive"
        : monthlyResult < 0 ? "resultNegative" : "resultEqual";

    const unavailable = (currencies: string[]) => (
        <div className="visual-dashboard-state" role="status">
            <strong>{t("dashboard.unavailable.title")}</strong>
            <span>{t("dashboard.visual.ratesMissing", { currencies: currencies.join(", ") })}</span>
            <InExButton kind="ghost" onClick={retryRates} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
        </div>
    );

    return (
        <div className="visual-dashboard-page">
        <BasicPage
            extra={(
                <div className="visual-dashboard-actions">
                    <span className="visual-dashboard-period">{currentPeriodLabel}</span>
                    <InExButton kind="primary" onClick={() => navigate("/transactions?create=true")}>
                        {t("dashboard.addTransaction")}
                    </InExButton>
                </div>
            )}
            frame="analytics"
            title={t("dashboard.title")}
        >
            <div className="visual-dashboard-workspace" data-qa="visual-dashboard">
                {selectedLinkedUserId !== null ? (
                    <Alert message={t("linkedAccount.readOnly", { username: selectedLinkedAccount?.username ?? "" })} showIcon type="info" />
                ) : null}
                <div className="visual-dashboard-grid">
                    <section
                        aria-labelledby="visual-expenses-title"
                        className="visual-dashboard-card visual-dashboard-expenses"
                        data-qa="visual-expenses"
                        onKeyDown={(event) => {
                            if (event.key === "Escape" && expenseParentName) {
                                event.preventDefault();
                                returnToParents();
                            }
                        }}
                    >
                        <div className="visual-dashboard-card__header">
                            <div>
                                <h2 id="visual-expenses-title" ref={expenseHeading} tabIndex={-1}>{t("dashboard.visual.expensesTitle")}</h2>
                                {expenseParentName && !expenseAutoExpanded ? <p data-qa="visual-expense-context">{expenseParentName}</p> : null}
                            </div>
                        </div>
                        <div className="visual-dashboard-category-controls">
                            <SegmentedControl
                                label={<span className="visual-dashboard-sr-only">{t("dashboard.visual.categoryView")}</span>}
                                onChange={(value) => setCategoryMode(value === "child" ? "child" : "parent")}
                                options={[
                                    { key: "parent", label: t("dashboard.visual.mainCategories") },
                                    { key: "child", label: t("dashboard.visual.subcategories") },
                                ]}
                                size="compact"
                                value={categoryMode}
                            />
                            {expenseParentName ? (
                                <InExButton aria-label={t("dashboard.visual.backToCategories")} icon={<ChevronLeft size={15} />} kind="ghost" onClick={returnToParents} size="sm">
                                    {t("dashboard.visual.allCategories")}
                                </InExButton>
                            ) : null}
                        </div>
                        <Spin spinning={categoryPending} tip={t("dashboard.categories.loading")}>
                            {categoryError ? (
                                <div className="visual-dashboard-state" role="alert">{t("dashboard.categories.error")}</div>
                            ) : categoryPending ? (
                                <div className="visual-dashboard-state visual-dashboard-state--loading" />
                            ) : expenseMissingRates.length > 0 ? unavailable(expenseMissingRates) : expenseSlices.length === 0 ? (
                                <div className="visual-dashboard-empty" role="status">
                                    <div className="visual-dashboard-empty__ring" aria-hidden="true"><ArrowDown size={28} /></div>
                                    <p>{t("dashboard.visual.expenseEmpty")}</p>
                                </div>
                            ) : (
                                <div className="visual-dashboard-expense-layout">
                                    <div className="visual-dashboard-donut">
                                        <div className="visual-dashboard-donut__chart" aria-hidden="true">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={expenseSlices}
                                                    dataKey="amount"
                                                    innerRadius="72%"
                                                    isAnimationActive={false}
                                                    nameKey="label"
                                                    onClick={(_, index) => selectExpense(expenseSlices[index])}
                                                    onMouseEnter={(_, index) => setHighlightedCategory(expenseSlices[index].key)}
                                                    onMouseLeave={() => setHighlightedCategory(null)}
                                                    outerRadius="94%"
                                                    paddingAngle={expenseSlices.length > 1 ? 2 : 0}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    stroke="var(--bg-surface)"
                                                    strokeWidth={2}
                                                >
                                                    {expenseSlices.map((slice, index) => (
                                                        <Cell
                                                            fill={EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length]}
                                                            fillOpacity={highlightedCategory && highlightedCategory !== slice.key ? 0.3 : 1}
                                                            key={slice.key}
                                                            style={{ cursor: "pointer", transition: "fill-opacity 160ms ease" }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [money(Number(value)), t("dashboard.categories.amount")]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        </div>
                                        <div className="visual-dashboard-donut__center">
                                            <span>{t(expenseParentName && !expenseAutoExpanded ? "dashboard.visual.selectedTotal" : "dashboard.visual.expenseTotal")}</span>
                                            <Num dataQa="visual-expense-total" currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={totalExpense} />
                                        </div>
                                    </div>
                                    <ol aria-label={t("dashboard.categories.expenseSummary")} className="visual-dashboard-legend" ref={legendRef}>
                                        {expenseSlices.map((slice, index) => {
                                            const share = totalExpense > 0 ? slice.amount / totalExpense : 0;
                                            return (
                                                <li key={slice.key}>
                                                    <button
                                                        aria-expanded={slice.isOther ? otherExpanded : undefined}
                                                        aria-label={t("dashboard.visual.selectCategory", {
                                                            category: slice.label, percentage: percentage(share), amount: money(slice.amount),
                                                        })}
                                                        className={highlightedCategory === slice.key ? "is-highlighted" : undefined}
                                                        data-category-key={slice.key}
                                                        onBlur={() => setHighlightedCategory(null)}
                                                        onClick={() => selectExpense(slice)}
                                                        onFocus={() => setHighlightedCategory(slice.key)}
                                                        onMouseEnter={() => setHighlightedCategory(slice.key)}
                                                        onMouseLeave={() => setHighlightedCategory(null)}
                                                        type="button"
                                                    >
                                                        <span aria-hidden="true" className="visual-dashboard-swatch" style={{ background: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length] }} />
                                                        <span className="visual-dashboard-legend__name">{slice.label}</span>
                                                        <strong className="visual-dashboard-legend__percentage">{percentage(share)}</strong>
                                                        <span className="visual-dashboard-legend__amount"><Num currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={slice.amount} /></span>
                                                    </button>
                                                    {slice.isOther && otherExpanded && slice.members ? (
                                                        <ol className="visual-dashboard-legend__members">
                                                            {slice.members.map((member) => (
                                                                <li key={member.key}>
                                                                    <button onClick={() => selectExpense(member, "other")} type="button">
                                                                        <span>{member.label}</span>
                                                                        <Num currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={member.amount} />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    ) : null}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                            )}
                        </Spin>
                    </section>

                    <div className="visual-dashboard-right-column">
                    <section aria-labelledby="visual-money-title" className="visual-dashboard-card visual-dashboard-money" data-qa="visual-money">
                        <div className="visual-dashboard-card__header">
                            <div><h2 id="visual-money-title">{t("dashboard.visual.moneyTitle")}</h2><p>{t("dashboard.visual.moneyHint")}</p></div>
                            <span className="visual-dashboard-icon"><Wallet size={21} aria-hidden="true" /></span>
                        </div>
                        <Spin spinning={moneyPending} tip={t("dashboard.balance.loading")}>
                            {moneyError ? (
                                <div className="visual-dashboard-state" role="alert">{t("dashboard.balance.error")}</div>
                            ) : moneyPending ? <div className="visual-dashboard-state visual-dashboard-state--loading" /> : visibleAccounts.length === 0 ? (
                                <div className="visual-dashboard-state" role="status">
                                    <span>{t("dashboard.visual.accountsEmpty")}</span>
                                    <Link to="/accounts">{t("dashboard.balance.manageAccounts")}</Link>
                                </div>
                            ) : accountConversion.isComplete ? (
                                    <div className="visual-dashboard-money__total">
                                        <Num accessibleLabel={t("dashboard.visual.totalBalance", { currency: baseCurrency })} dataQa="visual-balance-total" currency={baseCurrency} currencySize="sm" kind={accountConversion.value < 0 ? "expense" : "neutral"} locale={locale} signage="negative-only" value={accountConversion.value} />
                                        <p>{t("dashboard.balance.metadata", { count: visibleAccounts.length, date: effectiveDate })}</p>
                                    </div>
                                ) : unavailable(accountConversion.unavailableCurrencies)}
                        </Spin>
                        <VisualAccountDistribution data={data} error={moneyError} key={selectedLinkedUserId ?? "self"} pending={moneyPending} />
                    </section>

                    <IncomeDistribution data={data} pending={categoryPending} error={categoryError} unavailable={unavailable} />
                    </div>

                    <section aria-labelledby="visual-flow-title" className="visual-dashboard-card visual-dashboard-flow" data-qa="visual-flow">
                        <div className="visual-dashboard-card__header"><div><h2 id="visual-flow-title">{t(getVisualDashboardFlowTitleKey(summaryQuery.currentData?.currentScope.period?.startDate))}</h2></div></div>
                        <Spin spinning={flowPending} tip={t("dashboard.cashFlow.loading")}>
                            {accountsQuery.isError || summaryQuery.isError ? (
                                <div className="visual-dashboard-state" role="alert">{t("dashboard.cashFlow.error")}</div>
                            ) : flowPending ? <div className="visual-dashboard-state visual-dashboard-state--loading" />
                                : cashFlowConversion && !cashFlowConversion.isComplete ? unavailable(missingCashFlowRates) : (
                                    <div className="visual-dashboard-flow__layout">
                                        <div className="visual-dashboard-flow__bars" aria-label={t("dashboard.cashFlow.summaryTitle")}>
                                            {cashFlowChartData.map((item) => (
                                                <button disabled={!hasReportingAccounts} data-flow={item.key} className={`visual-dashboard-flow__row visual-dashboard-flow__row--${item.key}`} key={item.key} onClick={() => openFlow(item.key === "income" ? "income" : "expense")} type="button">
                                                    <span className="visual-dashboard-flow__label">{item.key === "income" ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}{item.label}</span>
                                                    <Num currency={baseCurrency} currencySize="sm" kind={item.key === "income" ? "income" : "expense"} locale={locale} signage="negative-only" value={item.key === "income" ? item.value : -item.value} />
                                                    <span aria-hidden="true" className="visual-dashboard-flow__track"><span data-qa="visual-flow-bar" style={{ width: `${flowMaximum > 0 ? item.value / flowMaximum * 100 : 0}%` }} /></span>
                                                </button>
                                            ))}
                                        </div>
                                        <div data-qa="visual-flow-result" className={`visual-dashboard-result visual-dashboard-result--${monthlyResult < 0 ? "negative" : monthlyResult > 0 ? "positive" : "neutral"}`} role="status">
                                            <span aria-hidden="true" className="visual-dashboard-result__icon">{monthlyResult < 0 ? <ArrowDown size={23} /> : monthlyResult > 0 ? <ArrowUp size={23} /> : <ArrowRight size={23} />}</span>
                                            <p>{t(`dashboard.visual.${resultKey}`, { amount: money(Math.abs(monthlyResult)) })}</p>
                                        </div>
                                    </div>
                                )}
                        </Spin>
                    </section>
                </div>
            </div>
        </BasicPage>
        </div>
    );
};

export default VisualDashboard;
