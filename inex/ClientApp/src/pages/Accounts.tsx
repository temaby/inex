import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "antd";
import {
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Plus,
    RefreshCw,
    Wallet,
} from "lucide-react";

import {
    EmptyState,
    FilterEmpty,
    InExButton,
    InExDrawer,
    Input,
    Num,
    SegmentedControl,
    Tag as InExTag,
} from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import { useAppSelector } from "../store/hooks";
import apiClient from "../utils/apiClient";
import {
    useGetAccountsQuery,
    useGetAccountsSummaryQuery,
} from "../store/accounts/accounts-api";
import AccountCreateForm from "./Accounts/AccountCreateForm";
import AccountEditForm from "./Accounts/AccountEditForm";
import {
    AccountDisplay,
    buildDisplayAccounts,
    getAccountDisplayDescription,
    getBaseCurrency,
    getTotalAbsBaseValue,
    getTotalBaseValue,
    hasBaseValues,
    makeCurrencyGroups,
    normalizeAccountSearch,
    sortAccountsByBaseValue,
    toFixedMoney,
} from "./Accounts/accounts-utils";
import "./Accounts/accounts.css";

type AccountScope = "active" | "all";
type AccountViewMode = "currency" | "flat";

interface CurrencyOption {
    id: number;
    key: string;
}

const currencyToneClass = (currency: string): string => {
    const tones = ["teal", "slate", "amber", "terracotta", "ink"];
    const seed = currency.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return tones[seed % tones.length];
};

const getCurrencySegmentWidth = (share: number): number =>
    share === 0 ? 0 : Math.min(100, Math.max(1.5, share));

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

const Accounts = () => {
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [scope, setScope] = useState<AccountScope>("active");
    const [viewMode, setViewMode] = useState<AccountViewMode>("currency");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [collapsedCurrencies, setCollapsedCurrencies] = useState<Set<string>>(new Set());
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [pendingCreatedFocusRestore, setPendingCreatedFocusRestore] = useState(false);
    const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);

    const exchangeRates = useAppSelector((state) => state.rates.items);
    const userCurrencyId = useAppSelector((state) => state.auth.user?.currencyId);
    const profileCurrency = useMemo(
        () => currencies.find((currency) => currency.id === userCurrencyId)?.key.trim() || null,
        [currencies, userCurrencyId],
    );
    const baseCurrency = getBaseCurrency(exchangeRates, profileCurrency);

    useEffect(() => {
        let cancelled = false;

        apiClient.get<CurrencyOption[]>("/currencies")
            .then(({ data }) => {
                if (!cancelled) {
                    setCurrencies(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCurrencies([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const accountsQuery = useGetAccountsQuery("ALL");
    const accounts = accountsQuery.data ?? [];
    const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts]);
    const summaryQuery = useGetAccountsSummaryQuery(accountIds, { skip: accountIds.length === 0 });
    const summaries = summaryQuery.data ?? [];
    const summaryIds = useMemo(
        () => new Set(summaries.map((summary) => summary.id)),
        [summaries],
    );

    const displayAccounts = useMemo(
        () => buildDisplayAccounts(accounts, summaries, baseCurrency, exchangeRates),
        [accounts, baseCurrency, exchangeRates, summaries],
    );

    const scopedAccounts = useMemo(
        () => scope === "active"
            ? displayAccounts.filter((account) => account.isEnabled)
            : displayAccounts,
        [displayAccounts, scope],
    );

    const searchedAccounts = useMemo(() => {
        const query = normalizeAccountSearch(search);
        if (!query) return scopedAccounts;
        return scopedAccounts.filter((account) =>
            normalizeAccountSearch(`${account.name} ${account.description ?? ""} ${account.currency}`).includes(query),
        );
    }, [scopedAccounts, search]);

    const totalBaseValue = useMemo(
        () => getTotalBaseValue(scopedAccounts),
        [scopedAccounts],
    );

    const totalAbsBaseValue = useMemo(
        () => getTotalAbsBaseValue(scopedAccounts),
        [scopedAccounts],
    );

    const hasScopedBaseValues = useMemo(
        () => hasBaseValues(scopedAccounts),
        [scopedAccounts],
    );

    const hasCompleteScopedBaseValues = useMemo(
        () => hasScopedBaseValues
            && scopedAccounts.every((account) => summaryIds.has(account.id) && account.baseValue !== null),
        [hasScopedBaseValues, scopedAccounts, summaryIds],
    );

    const equivalentShareTotal = hasCompleteScopedBaseValues ? totalAbsBaseValue : null;

    const thisMonthNet = useMemo(
        () => scopedAccounts.reduce((sum, account) => sum + (account.thisMonthNetBase ?? 0), 0),
        [scopedAccounts],
    );

    const groups = useMemo(
        () => makeCurrencyGroups(searchedAccounts, equivalentShareTotal),
        [equivalentShareTotal, searchedAccounts],
    );

    const distributionGroups = useMemo(
        () => makeCurrencyGroups(scopedAccounts, equivalentShareTotal),
        [equivalentShareTotal, scopedAccounts],
    );

    const sortedFlatAccounts = useMemo(
        () => sortAccountsByBaseValue(searchedAccounts),
        [searchedAccounts],
    );

    const activeCount = displayAccounts.filter((account) => account.isEnabled).length;
    const scopedCount = scopedAccounts.length;
    const currencyCount = new Set(displayAccounts.map((account) => account.currency)).size;
    const hasSearch = normalizeAccountSearch(search).length > 0;
    const isInitialLoading = accountsQuery.isLoading && accounts.length === 0;
    const isRefreshing = (accountsQuery.isFetching || summaryQuery.isFetching) && accounts.length > 0;
    const hasLoadError = accountsQuery.isError && accounts.length === 0;
    const hasPartialError = (accountsQuery.isError || summaryQuery.isError) && accounts.length > 0;
    const loadErrorDetail = getErrorDetail(accountsQuery.error);
    const lastMonthBase = totalBaseValue - thisMonthNet;
    const hasMonthNetValues = scopedAccounts.length > 0
        && scopedAccounts.every((account) => summaryIds.has(account.id) && account.thisMonthNetBase !== null);
    const momPercent = hasCompleteScopedBaseValues && hasMonthNetValues && lastMonthBase !== 0
        ? (thisMonthNet / Math.abs(lastMonthBase)) * 100
        : null;
    const canRenderHeroDelta = Boolean(baseCurrency) && momPercent !== null;

    const clearFilters = () => {
        setSearch("");
        if (scope === "active" && scopedAccounts.length === 0) {
            setScope("all");
        }
    };

    const retryAccounts = () => {
        accountsQuery.refetch();
        if (accountIds.length > 0) summaryQuery.refetch();
    };

    const formatGroupCount = (count: number): string =>
        count === 1
            ? t("accounts.group.accountCountOne", { count })
            : t("accounts.group.accountCountOther", { count });

    const focusDrawerTrigger = React.useCallback((preferHeaderFallback = false) => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
        const findEnabledButton = (label: string) =>
            buttons.find((button) => !button.disabled && button.textContent?.trim() === label) ?? null;
        const originalTrigger = drawerTriggerRef.current;
        const connectedOriginalTrigger = originalTrigger?.isConnected ? originalTrigger : null;
        const headerAddButton = findEnabledButton(t("accounts.addAccount"));
        const emptyAddButton = findEnabledButton(t("accounts.emptyState.primaryAction"));
        const focusTarget = preferHeaderFallback
            ? headerAddButton ?? connectedOriginalTrigger ?? emptyAddButton
            : connectedOriginalTrigger ?? headerAddButton ?? emptyAddButton;

        focusTarget?.focus();
    }, [t]);

    const openDrawer: React.MouseEventHandler<HTMLButtonElement> = (event) => {
        drawerTriggerRef.current = event.currentTarget;
        setDrawerOpen(true);
    };

    const closeDrawer = (preferHeaderFallback = false) => {
        if (preferHeaderFallback) {
            setPendingCreatedFocusRestore(true);
        }
        setDrawerOpen(false);
        window.setTimeout(() => focusDrawerTrigger(preferHeaderFallback), 0);
        if (preferHeaderFallback) {
            window.setTimeout(() => focusDrawerTrigger(true), 250);
        }
    };

    useEffect(() => {
        if (!pendingCreatedFocusRestore || drawerOpen || accounts.length === 0) return;

        window.setTimeout(() => focusDrawerTrigger(true), 0);
        setPendingCreatedFocusRestore(false);
    }, [accounts.length, drawerOpen, focusDrawerTrigger, pendingCreatedFocusRestore]);

    const toggleCurrencyGroup = (currency: string) => {
        setCollapsedCurrencies((current) => {
            const next = new Set(current);
            if (next.has(currency)) {
                next.delete(currency);
            } else {
                next.add(currency);
            }
            return next;
        });
    };

    const renderBaseEquivalent = (
        value: number | null,
        options: { approx?: boolean; className?: string } = {},
    ) => {
        if (value === null || !baseCurrency) {
            return (
                <span className={options.className ?? "accounts-muted-metric"}>
                    {t("accounts.equivalent.unavailable")}
                </span>
            );
        }

        return (
            <span className={options.className ?? "accounts-base-equivalent"}>
                {options.approx && (
                    <span className="accounts-base-equivalent__prefix">
                        {t("accounts.equivalent.approx")}
                    </span>
                )}
                <Num
                    currency={baseCurrency}
                    kind={value < 0 ? "expense" : "neutral"}
                    value={toFixedMoney(value)}
                />
            </span>
        );
    };

    const getRateToBaseLabel = (account: AccountDisplay): string | null => {
        if (!baseCurrency) return null;
        if (account.currency === baseCurrency) {
            return t("accounts.snapshot.rateValue", {
                value: "1.0000",
                baseCurrency,
                currency: account.currency,
            });
        }

        const rate = exchangeRates.find((item) =>
            item.currencyFrom === baseCurrency && item.currencyTo === account.currency,
        );

        if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) return null;

        const rateToBase = 1 / rate.rate;

        return t("accounts.snapshot.rateValue", {
            value: rateToBase.toFixed(rateToBase < 0.01 ? 6 : 4),
            baseCurrency,
            currency: account.currency,
        });
    };

    const renderSnapshotMetric = (label: string, value: React.ReactNode) => (
        <div className="accounts-snapshot__metric">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );

    const renderHeroDelta = () => {
        if (!canRenderHeroDelta) {
            return t("accounts.hero.momUnavailable");
        }

        return (
            <React.Fragment>
                <span className="accounts-hero__delta-main">
                    <Num
                        currency={baseCurrency ?? undefined}
                        kind={thisMonthNet < 0 ? "expense" : "income"}
                        signage="signed"
                        value={toFixedMoney(thisMonthNet)}
                    />
                    <span>
                        {t("accounts.hero.momDeltaPercent", {
                            value: `${momPercent >= 0 ? "+" : ""}${momPercent.toFixed(1)}%`,
                        })}
                    </span>
                </span>
                <span className="accounts-hero__delta-helper">
                    {t("accounts.hero.momComparisonFallback")}
                </span>
            </React.Fragment>
        );
    };

    const renderAccountSnapshot = (account: AccountDisplay) => {
        const rateToBase = getRateToBaseLabel(account);
        const baseEquivalentLabel = baseCurrency
            ? t("accounts.snapshot.baseEquivalent", { currency: baseCurrency })
            : t("accounts.equivalent.unavailable");

        return (
            <aside className="accounts-snapshot" aria-label={t("accounts.snapshot.title")}>
                <div className="accounts-snapshot__title">{t("accounts.snapshot.title")}</div>
                <div className="accounts-snapshot__grid">
                    {renderSnapshotMetric(
                        t("accounts.snapshot.currentBalance"),
                        account.value === undefined
                            ? t("accounts.hero.balanceUnavailable")
                            : (
                                <Num
                                    currency={account.currency}
                                    kind={account.value < 0 ? "expense" : "neutral"}
                                    value={toFixedMoney(account.value)}
                                />
                            ),
                    )}
                    {renderSnapshotMetric(
                        baseEquivalentLabel,
                        renderBaseEquivalent(account.baseValue, { className: "accounts-snapshot__amount" }),
                    )}
                    {rateToBase && renderSnapshotMetric(t("accounts.snapshot.rateToBase"), rateToBase)}
                    {renderSnapshotMetric(t("accounts.snapshot.accountId"), `#${account.id}`)}
                </div>
            </aside>
        );
    };

    const renderRow = (account: AccountDisplay) => {
        const share = account.baseValue === null || equivalentShareTotal === null
            ? null
            : equivalentShareTotal > 0
                ? Math.abs(account.baseValue / equivalentShareTotal) * 100
                : 0;
        const expanded = expandedId === account.id;
        const accountValue = account.value;
        const balanceUnavailable = accountValue === undefined;
        const displayDescription = getAccountDisplayDescription(account.name, account.description);

        return (
            <div className="accounts-row-wrap" key={account.id}>
                <button
                    aria-expanded={expanded}
                    className={`accounts-row${account.isEnabled ? "" : " is-disabled"}`}
                    onClick={() => setExpandedId(expanded ? null : account.id)}
                    type="button"
                >
                    <span className="accounts-row__main">
                        <span className="accounts-row__name">{account.name}</span>
                        <span className="accounts-row__meta">
                            {displayDescription && <span>{displayDescription}</span>}
                            {!account.isEnabled && (
                                <InExTag kind="neutral">{t("accounts.disabled")}</InExTag>
                            )}
                        </span>
                    </span>
                    <span className={`accounts-currency-badge is-${currencyToneClass(account.currency)}`}>
                        {account.currency}
                    </span>
                    <span className="accounts-row__share">
                        <span>
                            {share === null
                                ? t("accounts.equivalent.unavailable")
                                : t("accounts.shareOfNetWorth", { value: share.toFixed(1) })}
                        </span>
                        {account.baseValue !== null && renderBaseEquivalent(account.baseValue, {
                            className: "accounts-row__equivalent",
                        })}
                    </span>
                    <span className="accounts-row__balance">
                        {balanceUnavailable
                            ? <span className="accounts-muted-metric">{t("accounts.hero.balanceUnavailable")}</span>
                            : (
                                <React.Fragment>
                                    <Num
                                        currency={account.currency}
                                        kind={accountValue < 0 ? "expense" : "neutral"}
                                        value={toFixedMoney(accountValue)}
                                    />
                                    {renderBaseEquivalent(account.baseValue, {
                                        approx: true,
                                        className: "accounts-row__balance-equivalent",
                                    })}
                                </React.Fragment>
                            )}
                    </span>
                    <span className="accounts-row__chevron" aria-hidden="true">
                        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                    </span>
                </button>
                {expanded && (
                    <div className="accounts-edit-panel">
                        <div className="accounts-edit-panel__grid">
                            <AccountEditForm record={account} />
                            {renderAccountSnapshot(account)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInventoryHeader = () => {
        if (isInitialLoading || hasLoadError || searchedAccounts.length === 0) return null;

        return (
            <div className="accounts-list-header">
                <span>{t("accounts.headers.account")}</span>
                <span>{t("accounts.headers.currency")}</span>
                <span>{t("accounts.headers.share")}</span>
                <span>{t("accounts.headers.balance")}</span>
                <span aria-hidden="true" />
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
            return <div className="accounts-list">{sortedFlatAccounts.map(renderRow)}</div>;
        }

        return (
            <div className="accounts-groups">
                {groups.map((group) => {
                    const collapsed = collapsedCurrencies.has(group.currency);
                    const groupShare = group.share === null
                        ? t("accounts.equivalent.unavailable")
                        : t("accounts.shareOfNetWorth", { value: group.share.toFixed(1) });

                    return (
                        <section className="accounts-group" key={group.currency}>
                            <button
                                aria-expanded={!collapsed}
                                aria-label={t(collapsed ? "accounts.group.expand" : "accounts.group.collapse", {
                                    currency: group.currency,
                                })}
                                className="accounts-group__head"
                                onClick={() => toggleCurrencyGroup(group.currency)}
                                type="button"
                            >
                                <span className="accounts-group__identity">
                                    <span className="accounts-group__chevron" aria-hidden="true">
                                        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                    </span>
                                    <span className={`accounts-currency-badge is-${currencyToneClass(group.currency)}`}>
                                        {group.currency}
                                    </span>
                                    <span className="accounts-group__count">- {formatGroupCount(group.accounts.length)}</span>
                                </span>
                                <span className="accounts-group__metrics">
                                    <span className="accounts-group__share">{groupShare}</span>
                                    <span className="accounts-group__subtotal">
                                        {group.accounts.every((account) => account.value !== undefined)
                                            ? (
                                                <Num
                                                    currency={group.currency}
                                                    kind={group.subtotal < 0 ? "expense" : "neutral"}
                                                    value={toFixedMoney(group.subtotal)}
                                                />
                                            )
                                            : t("accounts.hero.balanceUnavailable")}
                                    </span>
                                    {renderBaseEquivalent(group.baseSubtotal, {
                                        approx: true,
                                        className: "accounts-group__base",
                                    })}
                                </span>
                            </button>
                            {group.share !== null && (
                                <div className="accounts-group__bar" aria-hidden="true">
                                    <span style={{ width: `${group.share === 0 ? 0 : Math.min(100, Math.max(4, group.share))}%` }} />
                                </div>
                            )}
                            {!collapsed && <div className="accounts-list">{group.accounts.map(renderRow)}</div>}
                        </section>
                    );
                })}
            </div>
        );
    };

    const drawer = (
        <InExDrawer
            open={drawerOpen}
            onClose={closeDrawer}
            title={t("accounts.addDrawerTitle")}
            subtitle={t("accounts.drawerSubtitle")}
        >
            <AccountCreateForm onCancel={() => closeDrawer()} onCreated={() => closeDrawer(true)} />
        </InExDrawer>
    );

    const pageExtra = (
        <InExButton icon={<Plus size={16} />} kind="primary" onClick={openDrawer}>
            {t("accounts.addAccount")}
        </InExButton>
    );

    if (!isInitialLoading && !hasLoadError && accounts.length === 0) {
        return (
            <React.Fragment>
                {drawer}
                <BasicPage title={t("accounts.title")} subtitle={t("accounts.subtitle")} extra={pageExtra}>
                    <div className="accounts-workspace accounts-workspace--empty">
                        <div className="accounts-first-empty">
                            <EmptyState
                                iconNode={<Wallet size={28} />}
                                title={t("accounts.emptyState.title")}
                                description={t("accounts.emptyState.description")}
                                actions={(
                                    <InExButton icon={<Plus size={15} />} kind="primary" onClick={openDrawer}>
                                        {t("accounts.emptyState.primaryAction")}
                                    </InExButton>
                                )}
                            />
                        </div>
                    </div>
                </BasicPage>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            {drawer}
            <BasicPage title={t("accounts.title")} subtitle={t("accounts.subtitle")} extra={pageExtra}>
                <div className="accounts-workspace">
                    <section className="accounts-hero">
                        <div className="accounts-hero__net">
                            <div className="accounts-eyebrow">{t("accounts.hero.netWorth")}</div>
                            <div className="accounts-hero__value">
                                {hasCompleteScopedBaseValues
                                    ? (
                                        <Num
                                            currency={baseCurrency ?? undefined}
                                            kind={totalBaseValue < 0 ? "expense" : "neutral"}
                                            value={toFixedMoney(totalBaseValue)}
                                        />
                                    )
                                    : <span>{t("accounts.hero.balanceUnavailable")}</span>}
                            </div>
                            <div className="accounts-hero__delta">
                                {renderHeroDelta()}
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
                                    <h2>
                                        {hasCompleteScopedBaseValues && baseCurrency
                                            ? t("accounts.hero.baseEquivalentLabel", { currency: baseCurrency })
                                            : t("accounts.hero.byCount")}
                                    </h2>
                                </div>
                                {isRefreshing && (
                                    <span className="accounts-refreshing">
                                        <RefreshCw size={13} />
                                        {t("accounts.loading.refreshing")}
                                    </span>
                                )}
                            </div>
                            <div
                                aria-label={baseCurrency
                                    ? t("accounts.hero.baseEquivalentLabel", { currency: baseCurrency })
                                    : t("accounts.equivalent.unavailable")}
                                className="accounts-distribution"
                            >
                                {distributionGroups.length > 0 ? (
                                    <React.Fragment>
                                        {hasCompleteScopedBaseValues && (
                                            <div className="accounts-distribution__stack" aria-hidden="true">
                                                {distributionGroups.map((group) => (
                                                    <span
                                                        className={`accounts-distribution__segment is-${currencyToneClass(group.currency)}`}
                                                        key={group.currency}
                                                        style={{ width: `${getCurrencySegmentWidth(group.share ?? 0)}%` }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <div className="accounts-distribution__legend">
                                            {distributionGroups.map((group) => (
                                                <div className="accounts-distribution__item" key={group.currency}>
                                                    <span className={`accounts-currency-dot is-${currencyToneClass(group.currency)}`} />
                                                    <span className="accounts-distribution__currency">{group.currency}</span>
                                                    <span className="accounts-distribution__share">
                                                        {group.share === null
                                                            ? t("accounts.equivalent.unavailable")
                                                            : `${group.share.toFixed(1)}%`}
                                                    </span>
                                                    {renderBaseEquivalent(group.baseSubtotal, {
                                                        className: "accounts-distribution__amount",
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <div className="accounts-muted-metric">{t("accounts.hero.noDistribution")}</div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="accounts-card">
                        <div className="accounts-toolbar" aria-label={t("accounts.toolbar.label")} role="region">
                            <div className="accounts-toolbar__primary">
                                <div className="accounts-toolbar__title">
                                    <h2>{t("accounts.workspaceTitle")}</h2>
                                    <p className="accounts-toolbar__summary">
                                        <span>
                                            {t("accounts.inventory.summary", {
                                                visible: searchedAccounts.length,
                                                total: scopedCount,
                                            })}
                                        </span>
                                        <span>
                                            {scope === "active"
                                                ? t("accounts.inventory.activeOnly", { count: activeCount })
                                                : t("accounts.inventory.allScope")}
                                        </span>
                                    </p>
                                    {hasPartialError && (
                                        <span className="accounts-inline-retry">
                                            {t("accounts.error.partialFailure")}
                                            <button onClick={retryAccounts} type="button">{t("accounts.error.retry")}</button>
                                        </span>
                                    )}
                                </div>
                                <SegmentedControl
                                    label={t("accounts.toolbar.statusLabel")}
                                    size="compact"
                                    value={scope}
                                    onChange={(key) => setScope(key as AccountScope)}
                                    options={[
                                        { key: "active", label: t("accounts.scope.active") },
                                        { key: "all", label: t("accounts.scope.all") },
                                    ]}
                                />
                            </div>
                            <div className="accounts-toolbar__filters">
                                <SegmentedControl
                                    label={t("accounts.toolbar.viewLabel")}
                                    size="compact"
                                    value={viewMode}
                                    onChange={(key) => setViewMode(key as AccountViewMode)}
                                    options={[
                                        { key: "currency", label: t("accounts.view.byCurrency") },
                                        { key: "flat", label: t("accounts.view.flat") },
                                    ]}
                                />
                                <Input
                                    aria-label={t("accounts.searchLabel")}
                                    className="accounts-toolbar__search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={t("accounts.searchPlaceholder")}
                                    variant="search"
                                />
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
                        {renderInventoryHeader()}
                        {renderAccountList()}
                    </section>
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Accounts;
