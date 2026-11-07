import * as React from "react";
import { Dropdown } from "antd";
import { ArrowRight, Check, ChevronDown, ChevronUp, MoreHorizontal, Pin, PinOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { InExButton, Num } from "../../components/primitives";
import type { AccountSummary } from "../../store/accounts/accounts-api";
import type { AccountBalanceConversionResult } from "./transaction-ledger-utils";

export interface AccountBalancesCompanionProps {
    visibleAccountCount: number;
    accounts: AccountSummary[];
    baseCurrency: string;
    conversion: AccountBalanceConversionResult;
    isError: boolean;
    isExpanded: boolean;
    isLoading: boolean;
    isPinned: boolean;
    selectedAccountIds: number[];
    onAccountToggle: (id: number) => void;
    isConversionLoading?: boolean;
    onConversionRetry?: () => void;
    onExpandedChange: () => void;
    onFocusChange?: (hasFocus: boolean) => void;
    onPinChange: () => void;
    onRetry: () => void;
    variant?: "drawer" | "inline" | "rail";
}

const AccountBalancesCompanion: React.FC<AccountBalancesCompanionProps> = ({
    visibleAccountCount,
    accounts,
    baseCurrency,
    conversion,
    isError,
    isExpanded,
    isLoading,
    isPinned,
    selectedAccountIds,
    onAccountToggle,
    isConversionLoading = false,
    onConversionRetry,
    onExpandedChange,
    onFocusChange,
    onPinChange,
    onRetry,
    variant = "inline",
}) => {
    const { t, i18n } = useTranslation();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const headingId = `transactions-account-balances-heading-${variant}`;
    const contentId = `transactions-account-balances-content-${variant}`;
    const canCollapse = variant === "inline";
    const showHeading = variant !== "drawer";
    const actionsMenu = (
        <Dropdown
            autoFocus
            menu={{ onKeyDown: (event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    setMenuOpen(false);
                    document.getElementById("transactions-account-balances-pin-control")?.focus();
                }
            }, items: [{
                key: "pin",
                icon: isPinned ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />,
                label: isPinned ? t("transactions.accountBalancesUnpin") : t("transactions.accountBalancesPin"),
                onClick: () => {
                    setMenuOpen(false);
                    onFocusChange?.(true);
                    onPinChange();
                },
            }] }}
            onOpenChange={setMenuOpen}
            open={menuOpen}
            placement="bottomRight"
            trigger={["click"]}>
            <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={t("transactions.accountBalancesActions")}
                className="transactions-account-balances__menu-trigger"
                id="transactions-account-balances-pin-control"
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMenuOpen(true);
                    }
                }}
                type="button">
                <MoreHorizontal size={19} aria-hidden="true" />
            </button>
        </Dropdown>
    );

    return (
        <section
            aria-label={showHeading ? undefined : t("transactions.accountBalances")}
            aria-labelledby={showHeading ? headingId : undefined}
            className={`transactions-account-balances transactions-account-balances--${variant}`}
            data-pinned={isPinned}
            data-qa={`account-balances-${variant}`}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) onFocusChange?.(false);
            }}
            onFocusCapture={() => onFocusChange?.(true)}>
            {showHeading ? (
                <div className="transactions-account-balances__header">
                    <div className="transactions-account-balances__heading">
                        <h2 id={headingId}>{t("transactions.accountBalances")}</h2>
                        <span>{t("transactions.accountBalancesSummary", { count: visibleAccountCount })}</span>
                    </div>
                    <div className="transactions-account-balances__actions">
                        {canCollapse && (
                            <InExButton aria-controls={contentId} aria-expanded={isExpanded} icon={isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} kind="ghost" onClick={onExpandedChange} size="sm">
                                {isExpanded ? t("transactions.accountBalancesCollapse") : t("transactions.accountBalancesExpand")}
                            </InExButton>
                        )}
                        {actionsMenu}
                    </div>
                </div>
            ) : <div className="transactions-account-balances__drawer-actions"><span>{t("transactions.accountBalancesSummary", { count: visibleAccountCount })}</span>{actionsMenu}</div>}
            {isExpanded && (
                <div id={contentId}>
                    {isLoading ? (
                        <div className="transactions-account-balances__state" role="status">{t("transactions.accountBalancesLoading")}</div>
                    ) : isError ? (
                        <div className="transactions-account-balances__state transactions-account-balances__state--error" role="alert">
                            <p>{t("transactions.accountBalancesError")}</p>
                            <InExButton icon={<RefreshCw size={15} />} kind="ghost" onClick={onRetry} size="sm">{t("transactions.error.retry")}</InExButton>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="transactions-account-balances__state" role="status">{t("transactions.accountBalancesEmpty")}</div>
                    ) : (
                        <>
                            <ul className="transactions-account-balances__list">
                                {accounts.map((account) => (
                                    <li key={account.id}>
                                        <button
                                            aria-pressed={selectedAccountIds.includes(account.id)}
                                            className="transactions-account-balances__account"
                                            onClick={() => onAccountToggle(account.id)}
                                            type="button">
                                            <span className="transactions-account-balances__account-label">
                                                <Check aria-hidden="true" className="transactions-account-balances__selected" size={13} />
                                                <span className="transactions-account-balances__name">{account.name}</span>
                                            </span>
                                            <span className={`transactions-account-balances__amount${account.value === 0 ? " transactions-account-balances__amount--zero" : ""}`}>
                                                <Num currency={account.currency} kind="neutral" locale={i18n?.language} signage="negative-only" value={account.value} />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="transactions-account-balances__total">
                                <span>{t("transactions.accountBalancesTotal")}</span>
                                {isConversionLoading ? (
                                    <span role="status">{t("transactions.accountBalancesConversionLoading")}</span>
                                ) : conversion.isComplete ? (
                                    <span className="transactions-account-balances__amount"><Num currency={baseCurrency} kind="neutral" locale={i18n?.language} signage="negative-only" value={conversion.value} /></span>
                                ) : (
                                    <span aria-label={t("transactions.accountBalancesConversionUnavailable")}>{t("transactions.kpi.notAvailable")}</span>
                                )}
                            </div>
                            {!isConversionLoading && !conversion.isComplete && conversion.unavailableCurrencies.length > 0 && (
                                <p className="transactions-account-balances__conversion-warning" role="status">
                                    {t("transactions.accountBalancesConversionDetail", { currencies: conversion.unavailableCurrencies.join(", ") })}
                                    {onConversionRetry && <InExButton icon={<RefreshCw size={13} />} kind="link" onClick={onConversionRetry} size="sm">{t("transactions.error.retry")}</InExButton>}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
            <Link className="transactions-account-balances__accounts-link" to="/accounts">{t("transactions.accountBalancesOpenAccounts")}<ArrowRight size={14} aria-hidden="true" /></Link>
        </section>
    );
};

export default AccountBalancesCompanion;
