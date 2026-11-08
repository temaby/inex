import * as React from "react";
import { useEffect } from "react";
import { Alert, DatePicker, Spin } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

import BasicPage from "../../layouts/BasicPage";
import { InExButton, Num } from "../../components/primitives";
import type { FamilyCategory, FamilyTotals } from "../../model/Report/FamilyStatistics";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useGetFamilyStatisticsQuery } from "../../store/report/report-api";
import { linkedAccountActions } from "../../store/linkedAccount/linked-account-slice";
import { fetchLinkedAccountContext } from "../../store/linkedAccount/linked-account-actions";
import { isSupportedDashboardMonth, useDashboardMonth } from "./useDashboardMonth";
import "./visual-dashboard.css";
import "./family-dashboard.css";

const COLORS = ["#d87366", "#e8a15b", "#9c89ca", "#739fc6", "#d9ac50", "#319b88", "#69b6c7", "#ce81a0"];

const FamilyDashboard = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const userId = useAppSelector((state) => state.auth.user?.id);
    const links = useAppSelector((state) => state.linkedAccount.linkState?.linkedAccounts);
    const membershipKey = (links ?? []).map((account) => account.id).sort((a, b) => a - b).join(",");
    const { selectedMonth, currentMonth, isHistoricalMonth, selectMonth } = useDashboardMonth(true, true);
    const query = useGetFamilyStatisticsQuery({
        year: Number(selectedMonth.slice(0, 4)), month: Number(selectedMonth.slice(5)),
        sessionUserId: userId ?? 0, membershipKey,
    }, { skip: !userId, refetchOnMountOrArgChange: true });
    // A refetch can change family membership. Clear every previous value while authorization is checked.
    const data = query.isFetching ? undefined : query.currentData;
    const unavailableAccess = query.error && "status" in query.error && query.error.status === 404;
    useEffect(() => {
        if (!unavailableAccess || !userId) return;
        dispatch(linkedAccountActions.familyScopeUnavailable());
        void dispatch(fetchLinkedAccountContext(userId));
    }, [dispatch, unavailableAccess, userId]);
    useEffect(() => {
        const refresh = () => { void query.refetch(); };
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [query.refetch]);

    const amount = (value: number | null, complete: boolean, qa?: string) => complete && value !== null
        ? <Num currency={data?.currency} dataQa={qa} fractionDigits={2} kind="neutral" locale={i18n.language} value={value} />
        : <span data-qa={qa}>{t("dashboard.family.unavailable")}</span>;
    const missing = (scope: "balance" | "cashFlow") => {
        const rates = Array.from(new Set(data?.missingRates.filter((rate) => rate.scope === scope)
            .map((rate) => `${rate.currency} (${rate.date.slice(0, 10)})`) ?? []));
        return <div className="family-dashboard-missing" role="status">
            <strong>{t("dashboard.unavailable.title")}</strong>
            <span>{t("dashboard.visual.ratesMissing", { currencies: rates.join(", ") })}</span>
            <InExButton kind="ghost" size="sm" onClick={() => void query.refetch()}>{t("dashboard.family.refresh")}</InExButton>
        </div>;
    };
    const categoryPanel = (flow: "income" | "expense", categories: FamilyCategory[] | null) => (
        <section className="visual-dashboard-card family-dashboard-category" data-qa={`family-${flow}-categories`} aria-labelledby={`family-${flow}-title`}>
            <h2 id={`family-${flow}-title`}>{t(flow === "income" ? "dashboard.visual.incomeTitle" : "dashboard.visual.expensesTitle")}</h2>
            <p>{t("dashboard.family.categoryScope")}</p>
            {!data?.totals.cashFlowComplete ? missing("cashFlow") : !categories?.length
                ? <p role="status">{t(flow === "income" ? "dashboard.visual.incomeEmpty" : "dashboard.visual.expenseEmpty")}</p>
                : <div className="family-dashboard-category-layout">
                    <div className="family-dashboard-pie" aria-hidden="true">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart><Pie data={categories} dataKey="amount" innerRadius={60} outerRadius={90} isAnimationActive={false}>
                                {categories.map((category, index) => <Cell key={`${category.userId}:${category.categoryId}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie></PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="family-dashboard-category-list">
                        {categories.map((category, index) => <li key={`${category.userId}:${category.categoryId}`}>
                            <span className="visual-dashboard-swatch" aria-hidden="true" style={{ background: COLORS[index % COLORS.length] }} />
                            <span className="family-dashboard-category-name">{category.path}<small>{category.username}</small></span>
                            {amount(category.amount, true)}
                        </li>)}
                    </ul>
                </div>}
        </section>
    );
    const participantValues = (totals: FamilyTotals) => (
        <dl className="family-dashboard-participant-totals">
            {(["balance", "income", "expenses", "surplus"] as const).map((key) => <div key={key}>
                <dt>{t(`dashboard.family.${key}`)}</dt>
                <dd>{amount(totals[key], key === "balance" ? totals.balanceComplete : totals.cashFlowComplete)}</dd>
            </div>)}
        </dl>
    );

    return <BasicPage title={t("dashboard.title")} subtitle={t("dashboard.family.title")} frame="management" extra={
        <div className="visual-dashboard-actions">
            <div className="visual-dashboard-month-controls" role="group" aria-label={t("dashboard.visual.monthLabel")}>
                <InExButton aria-label={t("dashboard.visual.previousMonth")} data-qa="family-month-previous" disabled={!isSupportedDashboardMonth(dayjs(`${selectedMonth}-01`).subtract(1, "month"))} icon={<ChevronLeft size={15} />} kind="ghost" size="sm" onClick={() => selectMonth(dayjs(`${selectedMonth}-01`).subtract(1, "month"))} />
                <DatePicker allowClear={false} aria-label={t("dashboard.visual.monthLabel")} className="visual-dashboard-month-picker" data-qa="family-month-picker" disabledDate={(date) => !isSupportedDashboardMonth(date) || date.startOf("month").isAfter(dayjs(`${currentMonth}-01`))} format="MMMM YYYY" inputReadOnly onChange={selectMonth} picker="month" value={dayjs(`${selectedMonth}-01`)} />
                <InExButton aria-label={t("dashboard.visual.nextMonth")} data-qa="family-month-next" disabled={!isHistoricalMonth} icon={<ChevronRight size={15} />} kind="ghost" size="sm" onClick={() => selectMonth(dayjs(`${selectedMonth}-01`).add(1, "month"))} />
            </div>
            <InExButton kind="ghost" size="sm" disabled={query.isFetching} data-qa="family-refresh" onClick={() => void query.refetch()}>{t("dashboard.family.refresh")}</InExButton>
        </div>
    }>
        <div className="visual-dashboard-workspace family-dashboard" data-qa="family-dashboard" aria-busy={query.isFetching}>
            <Alert showIcon type="info" message={t("dashboard.family.readOnly")} />
            {query.isFetching || query.isLoading ? <div className="family-dashboard-loading" role="status"><Spin /><span>{t("dashboard.family.loading")}</span></div>
                : query.isError || !data ? <div className="visual-dashboard-state" role="alert"><span>{t("dashboard.family.error")}</span><InExButton kind="ghost" onClick={() => void query.refetch()}>{t("dashboard.family.refresh")}</InExButton></div>
                    : <>
                        <div className="family-dashboard-context" data-qa="family-context">
                            <strong>{t("dashboard.family.currency", { currency: data.currency })}</strong>
                            <span>{data.participants.map((participant) => participant.username).join(" · ")}</span>
                        </div>
                        <div className="family-dashboard-summary">
                            <section className="visual-dashboard-card" data-qa="family-balance" aria-labelledby="family-balance-title">
                                <h2 id="family-balance-title">{t("dashboard.family.balance")}</h2>
                                <p>{t("dashboard.family.balanceScope", { date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(dayjs(data.balanceDate.slice(0, 10)).toDate()) })}</p>
                                {data.totals.balanceComplete ? <div className="family-dashboard-main-amount">{amount(data.totals.balance, true, "family-balance-total")}</div> : missing("balance")}
                            </section>
                            <section className="visual-dashboard-card" data-qa="family-cash-flow" aria-labelledby="family-flow-title">
                                <h2 id="family-flow-title">{t("dashboard.family.cashFlow")}</h2>
                                <p>{dayjs(`${selectedMonth}-01`).format("MMMM YYYY")}</p>
                                {!data.totals.cashFlowComplete ? missing("cashFlow") : <dl className="family-dashboard-flow">
                                    {(["income", "expenses", "surplus"] as const).map((key) => <div key={key}><dt>{t(`dashboard.family.${key}`)}</dt><dd>{amount(data.totals[key], true, `family-${key}-total`)}</dd></div>)}
                                </dl>}
                            </section>
                        </div>
                        <div className="family-dashboard-categories">{categoryPanel("expense", data.expenseCategories)}{categoryPanel("income", data.incomeCategories)}</div>
                        <section className="visual-dashboard-card" data-qa="family-participants" aria-labelledby="family-participants-title">
                            <h2 id="family-participants-title">{t("dashboard.family.participants")}</h2>
                            <div className="family-dashboard-participants">
                                {data.participants.map((participant) => <section className="family-dashboard-participant" key={participant.userId} aria-label={participant.username}>
                                    <h3>{participant.username}{participant.isMaster ? <small>{t("dashboard.family.master")}</small> : null}</h3>
                                    {participantValues(participant.totals)}
                                </section>)}
                            </div>
                            <p>{t("dashboard.family.transferNote")}</p>
                        </section>
                    </>}
        </div>
    </BasicPage>;
};

export default FamilyDashboard;
