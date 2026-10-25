import * as React from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Spin, Tooltip } from "antd";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Num } from "../../components/primitives";
import { getAccountBalanceConversionResult } from "../Transactions/transaction-ledger-utils";
import type { DashboardData } from "./useDashboardData";

const ACCOUNT_COLORS = ["#389b8b", "#ed8b75", "#9c89ca", "#739fc6", "#d9ac50", "#ce81a0", "#6db2ad", "#a4a26a", "#b98c73"];
const accountColor = (id: number) => ACCOUNT_COLORS[Math.abs(id) % ACCOUNT_COLORS.length];

export const VisualAccountDistribution = ({ data, pending, error }: {
    data: DashboardData;
    pending: boolean;
    error: boolean;
}) => {
    const { t, i18n, accountBalances, visibleAccounts, baseCurrency, exchangeRates, accountConversion, accountDataLoading, accountDataError, accountsQuery, accountBalancesQuery } = data;
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const detailsId = useId();
    const pickerRef = useRef<HTMLSelectElement>(null);
    const locale = i18n.language;
    const convertedAccounts = accountBalances.map((account) => ({
        ...account,
        converted: getAccountBalanceConversionResult([account], baseCurrency, exchangeRates),
        color: accountColor(account.id),
    }));
    const favoriteIds = new Set(visibleAccounts.filter((account) => account.isFavourite === true).map((account) => account.id));
    const favorites = convertedAccounts.filter((account) => favoriteIds.has(account.id)).sort((left, right) => (
        accountConversion.isComplete ? right.converted.value - left.converted.value || left.id - right.id : left.id - right.id
    )).slice(0, 5);
    const positiveAccounts = convertedAccounts.filter((account) => account.converted.value > 0);
    const positiveTotal = positiveAccounts.reduce((sum, account) => sum + account.converted.value, 0);
    const hasNegativeBalance = accountBalances.some((account) => account.value < 0);
    const showDistribution = accountConversion.isComplete && positiveTotal > 0 && !pending && !error;
    const selectedAccount = showDistribution ? positiveAccounts.find((account) => account.id === selectedId) : undefined;
    const nativePending = accountDataLoading || (accountsQuery.isFetching && !accountsQuery.currentData)
        || (accountBalancesQuery.isFetching && !accountBalancesQuery.currentData);

    useEffect(() => {
        if (!nativePending && !accountDataError && !accountBalances.some((account) => account.id === selectedId && account.value > 0)) {
            setSelectedId(null);
        }
    }, [accountBalances, accountDataError, nativePending, selectedId]);

    const clearSelection = () => {
        pickerRef.current?.focus();
        setSelectedId(null);
    };

    const percentage = (value: number) => `${value > 0 && value < 0.001 ? "<" : ""}${new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value > 0 && value < 0.001 ? 0.001 : value)}`;
    const money = (value: number, currency: string) => new Intl.NumberFormat(locale, {
        style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2,
    }).format(value);
    const accountDescription = (account: typeof convertedAccounts[number]) => t("dashboard.visual.accountSegment", {
        account: account.name,
        original: money(account.value, account.currency),
        converted: money(account.converted.value, baseCurrency),
        percentage: percentage(account.converted.value / positiveTotal),
    });
    const details = (account: typeof convertedAccounts[number]) => (
        <>
            <span className="visual-dashboard-account-detail__name"><span aria-hidden="true" className="visual-dashboard-swatch" style={{ background: account.color }} /><strong>{account.name}</strong></span>
            <span className="visual-dashboard-account-detail__amounts">
                <Num currency={account.currency} currencySize="sm" kind="neutral" locale={locale} signage="negative-only" value={account.value} />
                <span>{t("dashboard.visual.convertedBalance", { amount: money(account.converted.value, baseCurrency) })}</span>
                <span>{t("dashboard.visual.positiveShare", { percentage: percentage(account.converted.value / positiveTotal) })}</span>
            </span>
        </>
    );

    return (
        <>
            {showDistribution ? (
                <div className="visual-dashboard-account-distribution" onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        clearSelection();
                    }
                }}>
                    <div aria-label={t("dashboard.visual.accountDistribution")} className="visual-dashboard-account-bar" data-qa="visual-account-bar" role="group">
                        {positiveAccounts.map((account) => (
                            <Tooltip color="var(--bg-surface)" key={account.id} trigger={["hover", "focus"]} title={<div className="visual-dashboard-account-tooltip" data-qa="visual-account-tooltip">{details(account)}</div>}>
                                <button
                                    aria-controls={selectedAccount ? detailsId : undefined}
                                    aria-label={accountDescription(account)}
                                    aria-pressed={selectedId === account.id}
                                    data-account-id={account.id}
                                    onClick={() => setSelectedId(account.id)}
                                    style={{ background: account.color, width: `${account.converted.value / positiveTotal * 100}%` }}
                                    type="button"
                                />
                            </Tooltip>
                        ))}
                    </div>
                    <div className="visual-dashboard-account-distribution__caption">
                        <p>{t("dashboard.visual.distributionCurrency", { currency: baseCurrency })}</p>
                        <select aria-label={t("dashboard.visual.chooseAccount")} data-qa="visual-account-picker" onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)} ref={pickerRef} value={selectedId ?? ""}>
                            <option value="">{t("dashboard.visual.chooseAccount")}</option>
                            {positiveAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                        </select>
                    </div>
                    {selectedAccount ? (
                        <div className="visual-dashboard-account-selection" data-qa="visual-account-selection" id={detailsId} role="status">
                            <div>{details(selectedAccount)}</div>
                            <button aria-label={t("dashboard.visual.clearAccountSelection")} data-qa="visual-account-clear" onClick={clearSelection} type="button"><X aria-hidden="true" size={15} /></button>
                        </div>
                    ) : null}
                </div>
            ) : null}
            {!pending && !error && accountConversion.isComplete && accountBalances.length > 0 && (hasNegativeBalance || positiveTotal === 0) ? (
                <p className="visual-dashboard-hint">
                    {t(hasNegativeBalance ? "dashboard.visual.negativeBalancesHint" : "dashboard.visual.zeroBalancesHint")}
                    {hasNegativeBalance ? <> <Link to="/accounts">{t("dashboard.visual.allAccounts")}</Link></> : null}
                </p>
            ) : null}
            <div className="visual-dashboard-wallets">
                <span className="visual-dashboard-small-label">{t("dashboard.visual.favoriteAccounts")}</span>
                <Spin spinning={nativePending}>
                    {!accountDataError && !nativePending ? favorites.length > 0 ? (
                        <ul data-qa="visual-favorite-accounts">
                            {favorites.map((account) => (
                                <li data-account-id={account.id} key={account.id}>
                                    <Link to="/accounts">
                                        <span aria-hidden="true" className="visual-dashboard-swatch" style={{ background: account.color }} />
                                        <span className="visual-dashboard-wallets__name">{account.name}</span>
                                        <Num accessibleLabel={t("dashboard.balance.amountLabel")} currency={account.currency} currencySize="sm" kind={account.value < 0 ? "expense" : "neutral"} locale={locale} signage="negative-only" value={account.value} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="visual-dashboard-favorites-empty" data-qa="visual-favorites-empty" role="status">{t("dashboard.visual.favoritesEmpty")} <Link to="/accounts">{t("dashboard.balance.manageAccounts")}</Link></p> : null}
                </Spin>
                <Link className="visual-dashboard-all-accounts" to="/accounts">{t("dashboard.visual.allAccounts")}<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
        </>
    );
};
