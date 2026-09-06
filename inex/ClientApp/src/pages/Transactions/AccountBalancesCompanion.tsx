import * as React from "react";
import { ChevronDown, ChevronUp, Pin, PinOff, RefreshCw } from "lucide-react";
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
    onExpandedChange: () => void;
    onPinChange: () => void;
    onRetry: () => void;
    variant?: "inline" | "rail";
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
    onExpandedChange,
    onPinChange,
    onRetry,
    variant = "inline",
}) => {
    const { t } = useTranslation();
    const headingId = `transactions-account-balances-heading-${variant}`;
    const contentId = `transactions-account-balances-content-${variant}`;
    const canCollapse = variant === "inline";

    return (
        <section
            aria-labelledby={headingId}
            className={`transactions-account-balances transactions-account-balances--${variant}`}
            data-qa={`account-balances-${variant}`}>
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
                    <InExButton aria-pressed={isPinned} icon={isPinned ? <PinOff size={15} /> : <Pin size={15} />} kind="ghost" onClick={onPinChange} size="sm">
                        {isPinned ? t("transactions.accountBalancesUnpin") : t("transactions.accountBalancesPin")}
                    </InExButton>
                </div>
            </div>
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
                            <div className="transactions-account-balances__total">
                                <span>{t("transactions.summaryTotal")}</span>
                                {conversion.isComplete ? (
                                    <Num currency={baseCurrency} kind="neutral" signage="signed" value={conversion.value} />
                                ) : (
                                    <span aria-label={t("transactions.accountBalancesConversionUnavailable")}>{t("transactions.kpi.notAvailable")}</span>
                                )}
                            </div>
                            {!conversion.isComplete && conversion.unavailableCurrencies.length > 0 && (
                                <p className="transactions-account-balances__conversion-warning" role="status">
                                    {t("transactions.accountBalancesConversionDetail", { currencies: conversion.unavailableCurrencies.join(", ") })}
                                </p>
                            )}
                            <ul className="transactions-account-balances__list">
                                {accounts.map((account) => (
                                    <li key={account.id}>
                                        <span className="transactions-account-balances__name">{account.name}</span>
                                        <Num currency={account.currency} kind="neutral" signage="signed" value={account.value} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
            {variant === "rail" && <Link className="transactions-account-balances__accounts-link" to="/accounts">{t("transactions.accountBalancesOpenAccounts")}</Link>}
        </section>
    );
};

export default AccountBalancesCompanion;
