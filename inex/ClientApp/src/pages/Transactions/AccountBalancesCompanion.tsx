import * as React from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { InExButton, Num } from "../../components/primitives";
import type { AccountSummary } from "../../store/accounts/accounts-api";
import type { AccountBalanceConversionResult } from "./transaction-ledger-utils";

export interface AccountBalancesCompanionProps {
    activeAccountCount: number;
    accounts: AccountSummary[];
    baseCurrency: string;
    conversion: AccountBalanceConversionResult;
    hasDisplaySelection: boolean;
    isError: boolean;
    isExpanded: boolean;
    isLoading: boolean;
    onExpandedChange: () => void;
    onRetry: () => void;
}

const AccountBalancesCompanion: React.FC<AccountBalancesCompanionProps> = ({
    activeAccountCount,
    accounts,
    baseCurrency,
    conversion,
    hasDisplaySelection,
    isError,
    isExpanded,
    isLoading,
    onExpandedChange,
    onRetry,
}) => {
    const { t } = useTranslation();
    const headingId = "transactions-account-balances-heading";
    const contentId = "transactions-account-balances-content";

    return (
        <section
            aria-labelledby={headingId}
            className="transactions-account-balances"
            data-qa="account-balances"
        >
            <div className="transactions-account-balances__header">
                <div className="transactions-account-balances__heading">
                    <h2 id={headingId}>{t("transactions.accountBalances")}</h2>
                    <span>{t("transactions.accountBalancesSummary", { count: activeAccountCount })}</span>
                </div>
                <div className="transactions-account-balances__actions">
                    <InExButton
                        aria-controls={contentId}
                        aria-expanded={isExpanded}
                        icon={isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        kind="ghost"
                        onClick={onExpandedChange}
                        size="sm"
                    >
                        {isExpanded ? t("transactions.accountBalancesCollapse") : t("transactions.accountBalancesExpand")}
                    </InExButton>
                </div>
            </div>

            {isExpanded && (
                <div id={contentId}>
                    {isLoading ? (
                        <div className="transactions-account-balances__state" role="status">
                            {t("transactions.accountBalancesLoading")}
                        </div>
                    ) : isError ? (
                        <div className="transactions-account-balances__state transactions-account-balances__state--error" role="alert">
                            <p>{t("transactions.accountBalancesError")}</p>
                            <InExButton icon={<RefreshCw size={15} />} kind="ghost" onClick={onRetry} size="sm">
                                {t("transactions.error.retry")}
                            </InExButton>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="transactions-account-balances__state" role="status">
                            {activeAccountCount === 0 ? t("transactions.accountBalancesEmpty") : !hasDisplaySelection ? t("transactions.accountBalancesNoneSelected") : t("transactions.accountBalancesEmpty")}
                        </div>
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
                            {!conversion.isComplete && (
                                <p className="transactions-account-balances__conversion-warning" role="status">
                                    {t("transactions.accountBalancesConversionDetail", { currencies: conversion.unavailableCurrencies.join(", ") })}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

export default AccountBalancesCompanion;
