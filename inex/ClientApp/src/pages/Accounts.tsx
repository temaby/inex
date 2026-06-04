import * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "antd";
import {
    ChevronDown,
    ChevronUp,
    Plus,
    RefreshCw,
    Search,
    Wallet,
} from "lucide-react";

import {
    EmptyState,
    FilterEmpty,
    InExButton,
    InExDrawer,
    Num,
    SegmentedControl,
    Tag as InExTag,
} from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import { useAppSelector } from "../store/hooks";
import {
    AccountResponse,
    AccountSummary,
    useGetAccountsQuery,
    useGetAccountsSummaryQuery,
} from "../store/accounts/accounts-api";
import AccountCreateForm from "./Accounts/AccountCreateForm";
import AccountEditForm from "./Accounts/AccountEditForm";
import "./Accounts/accounts.css";

type AccountScope = "active" | "all";
type AccountViewMode = "currency" | "flat";

interface AccountDisplay extends AccountResponse {
    value?: number;
    thisMonthNet?: number;
}

interface CurrencyGroup {
    currency: string;
    accounts: AccountDisplay[];
    subtotal: number;
    share: number;
}

const currencyToneClass = (currency: string): string => {
    const tones = ["teal", "slate", "amber", "terracotta", "ink"];
    const seed = currency.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return tones[seed % tones.length];
};

const toFixedMoney = (value: number): number => Math.round(value * 100) / 100;

const normalize = (value: string): string => value.trim().toLowerCase();

const getErrorDetail = (error: unknown): string | null => {
    if (!error || typeof error !== "object") return null;
    if ("status" in error) {
        const maybeData = (error as { data?: unknown }).data;
        if (typeof maybeData === "string") return maybeData;
        if (maybeData && typeof maybeData === "object" && "detail" in maybeData) {
            const detail = (maybeData as { detail?: unknown }).detail;
            return typeof detail === "string" ? detail : null;
        }
    }
    return null;
};

const buildDisplayAccounts = (
    accounts: AccountResponse[],
    summaries: AccountSummary[],
): AccountDisplay[] => {
    const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));
    return accounts.map((account) => ({ ...account, ...summaryById.get(account.id) }));
};

const Accounts = () => {
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [scope, setScope] = useState<AccountScope>("active");
    const [viewMode, setViewMode] = useState<AccountViewMode>("currency");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const exchangeRates = useAppSelector((state) => state.rates.items);
    const baseCurrency = exchangeRates[0]?.currencyFrom ?? "USD";

    const accountsQuery = useGetAccountsQuery("ALL");
    const accounts = accountsQuery.data ?? [];
    const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts]);
    const summaryQuery = useGetAccountsSummaryQuery(accountIds, { skip: accountIds.length === 0 });
    const summaries = summaryQuery.data ?? [];

    const toBase = React.useCallback((value: number, currency: string): number => {
        if (!baseCurrency || currency === baseCurrency) return value;
        const rate = exchangeRates.find((item) => item.currencyTo === currency);
        return rate ? value / rate.rate : value;
    }, [baseCurrency, exchangeRates]);

    const displayAccounts = useMemo(
        () => buildDisplayAccounts(accounts, summaries),
        [accounts, summaries],
    );

    const scopedAccounts = useMemo(
        () => scope === "active"
            ? displayAccounts.filter((account) => account.isEnabled)
            : displayAccounts,
        [displayAccounts, scope],
    );

    const searchedAccounts = useMemo(() => {
        const query = normalize(search);
        if (!query) return scopedAccounts;
        return scopedAccounts.filter((account) =>
            normalize(`${account.name} ${account.description ?? ""} ${account.currency}`).includes(query),
        );
    }, [scopedAccounts, search]);

    const totalBaseValue = useMemo(
        () => summaries.reduce((sum, account) => sum + toBase(account.value, account.currency), 0),
        [summaries, toBase],
    );

    const thisMonthNet = useMemo(
        () => summaries.reduce((sum, account) => sum + toBase(account.thisMonthNet, account.currency), 0),
        [summaries, toBase],
    );

    const makeCurrencyGroups = React.useCallback((items: AccountDisplay[]): CurrencyGroup[] => {
        const byCurrency = new Map<string, AccountDisplay[]>();
        for (const account of items) {
            byCurrency.set(account.currency, [...(byCurrency.get(account.currency) ?? []), account]);
        }

        return Array.from(byCurrency.entries())
            .map(([currency, groupAccounts]) => {
                const subtotal = groupAccounts.reduce(
                    (sum, account) => sum + (account.value ?? 0),
                    0,
                );
                const baseSubtotal = groupAccounts.reduce(
                    (sum, account) => sum + toBase(account.value ?? 0, account.currency),
                    0,
                );
                const share = totalBaseValue === 0 ? 0 : Math.abs(baseSubtotal / totalBaseValue) * 100;
                return { currency, accounts: groupAccounts, subtotal, share };
            })
            .sort((a, b) => a.currency.localeCompare(b.currency));
    }, [toBase, totalBaseValue]);

    const groups = useMemo(
        () => makeCurrencyGroups(searchedAccounts),
        [makeCurrencyGroups, searchedAccounts],
    );

    const distributionGroups = useMemo(
        () => makeCurrencyGroups(scopedAccounts),
        [makeCurrencyGroups, scopedAccounts],
    );

    const activeCount = displayAccounts.filter((account) => account.isEnabled).length;
    const currencyCount = new Set(displayAccounts.map((account) => account.currency)).size;
    const hasSearch = normalize(search).length > 0;
    const isInitialLoading = accountsQuery.isLoading && accounts.length === 0;
    const isRefreshing = (accountsQuery.isFetching || summaryQuery.isFetching) && accounts.length > 0;
    const hasLoadError = accountsQuery.isError && accounts.length === 0;
    const hasPartialError = (accountsQuery.isError || summaryQuery.isError) && accounts.length > 0;
    const loadErrorDetail = getErrorDetail(accountsQuery.error);
    const lastMonthBase = totalBaseValue - thisMonthNet;
    const momPercent = lastMonthBase !== 0 ? (thisMonthNet / Math.abs(lastMonthBase)) * 100 : null;

    const clearFilters = () => {
        setScope("active");
        setViewMode("currency");
        setSearch("");
    };

    const retryAccounts = () => {
        accountsQuery.refetch();
        if (accountIds.length > 0) summaryQuery.refetch();
    };

    const formatGroupCount = (count: number): string =>
        count === 1
            ? t("accounts.group.accountCountOne", { count })
            : t("accounts.group.accountCountOther", { count });

    const renderRow = (account: AccountDisplay) => {
        const share = totalBaseValue === 0 || account.value === undefined
            ? 0
            : Math.abs(toBase(account.value, account.currency) / totalBaseValue) * 100;
        const expanded = expandedId === account.id;
        const accountValue = account.value;
        const balanceUnavailable = accountValue === undefined;

        return (
            <div className="accounts-row-wrap" key={account.id}>
                <button
                    aria-expanded={expanded}
                    className="accounts-row"
                    onClick={() => setExpandedId(expanded ? null : account.id)}
                    type="button"
                >
                    <span className="accounts-row__main">
                        <span className="accounts-row__name">{account.name}</span>
                        <span className="accounts-row__meta">
                            {account.description || t("accounts.noDescription")}
                        </span>
                    </span>
                    <span className={`accounts-currency-badge is-${currencyToneClass(account.currency)}`}>
                        {account.currency}
                    </span>
                    <span className="accounts-row__share">
                        <span className="accounts-share-bar" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                        </span>
                        {balanceUnavailable
                            ? t("accounts.hero.balanceUnavailable")
                            : t("accounts.shareOfNetWorth", { value: share.toFixed(0) })}
                    </span>
                    <span className="accounts-row__balance">
                        {balanceUnavailable
                            ? <span className="accounts-muted-metric">{t("accounts.hero.balanceUnavailable")}</span>
                            : <Num currency={account.currency} kind={accountValue < 0 ? "expense" : "neutral"} value={toFixedMoney(accountValue)} />}
                    </span>
                    <span className="accounts-row__status">
                        <InExTag kind={account.isEnabled ? "income" : "neutral"}>
                            {account.isEnabled ? t("accounts.active") : t("accounts.disabled")}
                        </InExTag>
                    </span>
                    <span className="accounts-row__chevron" aria-hidden="true">
                        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                    </span>
                </button>
                {expanded && (
                    <div className="accounts-edit-panel">
                        <AccountEditForm record={account} />
                    </div>
                )}
            </div>
        );
    };

    const renderAccountList = () => {
        if (isInitialLoading) {
            return (
                <div className="accounts-loading" aria-label={t("accounts.loading.initial")}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <span className="accounts-skeleton-row" key={index} />
                    ))}
                </div>
            );
        }

        if (hasLoadError) {
            return (
                <div className="accounts-load-failure">
                    <EmptyState
                        iconNode={<Wallet size={28} />}
                        title={t("accounts.error.loadTitle")}
                        description={t("accounts.error.loadDescription")}
                        actions={(
                            <InExButton icon={<RefreshCw size={15} />} kind="primary" onClick={retryAccounts}>
                                {t("accounts.error.retry")}
                            </InExButton>
                        )}
                        secondary={loadErrorDetail && <div className="accounts-error-detail">{loadErrorDetail}</div>}
                    />
                </div>
            );
        }

        if (accounts.length === 0) {
            return (
                <div className="accounts-empty-wrap">
                    <EmptyState
                        iconNode={<Wallet size={28} />}
                        title={t("accounts.emptyState.title")}
                        description={t("accounts.emptyState.description")}
                        actions={(
                            <InExButton icon={<Plus size={15} />} kind="primary" onClick={() => setDrawerOpen(true)}>
                                {t("accounts.emptyState.primaryAction")}
                            </InExButton>
                        )}
                    />
                </div>
            );
        }

        if (searchedAccounts.length === 0) {
            return (
                <div className="accounts-empty-wrap">
                    <FilterEmpty
                        title={t("accounts.filterEmpty.title")}
                        description={t("accounts.filterEmpty.description")}
                        onClear={clearFilters}
                    />
                </div>
            );
        }

        if (viewMode === "flat") {
            return <div className="accounts-list">{searchedAccounts.map(renderRow)}</div>;
        }

        return (
            <div className="accounts-groups">
                {groups.map((group) => (
                    <section className="accounts-group" key={group.currency}>
                        <div className="accounts-group__head">
                            <div>
                                <span className={`accounts-currency-badge is-${currencyToneClass(group.currency)}`}>
                                    {group.currency}
                                </span>
                                <span>{formatGroupCount(group.accounts.length)}</span>
                            </div>
                            <div className="accounts-group__subtotal">
                                {group.accounts.some((account) => account.value !== undefined)
                                    ? <Num currency={group.currency} kind={group.subtotal < 0 ? "expense" : "neutral"} value={toFixedMoney(group.subtotal)} />
                                    : t("accounts.hero.balanceUnavailable")}
                            </div>
                        </div>
                        <div className="accounts-group__bar" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, Math.max(4, group.share))}%` }} />
                        </div>
                        <div className="accounts-list">{group.accounts.map(renderRow)}</div>
                    </section>
                ))}
            </div>
        );
    };

    return (
        <React.Fragment>
            <InExDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={t("accounts.addDrawerTitle")}
                subtitle={t("accounts.drawerSubtitle")}
            >
                <AccountCreateForm onCreated={() => setDrawerOpen(false)} />
            </InExDrawer>
            <BasicPage
                title={t("accounts.title")}
                subtitle={t("accounts.subtitle")}
                extra={(
                    <InExButton icon={<Plus size={16} />} kind="primary" onClick={() => setDrawerOpen(true)}>
                        {t("accounts.addAccount")}
                    </InExButton>
                )}
            >
                <div className="accounts-workspace">
                    <section className="accounts-hero">
                        <div className="accounts-hero__net">
                            <div className="accounts-eyebrow">{t("accounts.hero.netWorth")}</div>
                            <div className="accounts-hero__value">
                                {summaries.length > 0
                                    ? <Num currency={baseCurrency} kind={totalBaseValue < 0 ? "expense" : "neutral"} value={toFixedMoney(totalBaseValue)} />
                                    : <span>{t("accounts.hero.balanceUnavailable")}</span>}
                            </div>
                            <div className="accounts-hero__delta">
                                {momPercent === null
                                    ? t("accounts.hero.momUnavailable")
                                    : t("accounts.hero.momDelta", {
                                        value: `${momPercent >= 0 ? "+" : ""}${momPercent.toFixed(1)}%`,
                                    })}
                            </div>
                            <div className="accounts-hero__stats">
                                <span>{t("accounts.hero.activeAccounts", { count: activeCount })}</span>
                                <span>{t("accounts.hero.currencyCount", { count: currencyCount })}</span>
                            </div>
                        </div>
                        <div className="accounts-hero__mix">
                            <div className="accounts-hero__mix-head">
                                <div>
                                    <div className="accounts-eyebrow">{t("accounts.hero.currencyDistribution")}</div>
                                    <h2>{summaries.length > 0 ? t("accounts.hero.byValue") : t("accounts.hero.byCount")}</h2>
                                </div>
                                {isRefreshing && (
                                    <span className="accounts-refreshing">
                                        <RefreshCw size={13} />
                                        {t("accounts.loading.refreshing")}
                                    </span>
                                )}
                            </div>
                            <div className="accounts-distribution">
                                {distributionGroups.length > 0 ? distributionGroups.map((group) => (
                                    <div className="accounts-distribution__item" key={group.currency}>
                                        <span className={`accounts-currency-dot is-${currencyToneClass(group.currency)}`} />
                                        <span>{group.currency}</span>
                                        <span>{group.share.toFixed(0)}%</span>
                                        <div className="accounts-distribution__bar" aria-hidden="true">
                                            <span style={{ width: `${Math.min(100, Math.max(4, group.share))}%` }} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="accounts-muted-metric">{t("accounts.hero.noDistribution")}</div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="accounts-card">
                        <div className="accounts-toolbar">
                            <div className="accounts-toolbar__title">
                                <h2>{t("accounts.workspaceTitle")}</h2>
                                {hasPartialError && (
                                    <span className="accounts-inline-retry">
                                        {t("accounts.error.partialFailure")}
                                        <button onClick={retryAccounts} type="button">{t("accounts.error.retry")}</button>
                                    </span>
                                )}
                            </div>
                            <div className="accounts-toolbar__controls">
                                <SegmentedControl
                                    value={scope}
                                    onChange={(key) => setScope(key as AccountScope)}
                                    options={[
                                        { key: "active", label: t("accounts.scope.active") },
                                        { key: "all", label: t("accounts.scope.all") },
                                    ]}
                                />
                                <SegmentedControl
                                    value={viewMode}
                                    onChange={(key) => setViewMode(key as AccountViewMode)}
                                    options={[
                                        { key: "currency", label: t("accounts.view.byCurrency") },
                                        { key: "flat", label: t("accounts.view.flat") },
                                    ]}
                                />
                                <label className="accounts-search">
                                    <Search aria-hidden="true" size={16} />
                                    <span className="sr-only">{t("accounts.searchLabel")}</span>
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={t("accounts.searchPlaceholder")}
                                    />
                                </label>
                            </div>
                        </div>
                        {hasPartialError && (
                            <div className="accounts-inline-error">
                                <Alert
                                    action={<button onClick={retryAccounts} type="button">{t("accounts.error.retry")}</button>}
                                    message={t("accounts.error.partialDescription")}
                                    showIcon
                                    type="warning"
                                />
                            </div>
                        )}
                        {hasSearch && (
                            <div className="accounts-filter-strip">
                                <span>{t("accounts.filteringBy", { query: search })}</span>
                                <button onClick={() => setSearch("")} type="button">
                                    {t("accounts.clearSearch")}
                                </button>
                            </div>
                        )}
                        {renderAccountList()}
                    </section>
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Accounts;
