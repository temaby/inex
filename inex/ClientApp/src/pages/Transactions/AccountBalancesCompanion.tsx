import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { InExButton, Num } from "../../components/primitives";
import type { AccountSummary } from "../../store/accounts/accounts-api";

export interface AccountBalancesCompanionProps {
    accounts: AccountSummary[];
    isError: boolean;
    isLoading: boolean;
    onRetry: () => void;
    showHeading?: boolean;
}

const AccountBalancesCompanion: React.FC<AccountBalancesCompanionProps> = ({
    accounts,
    isError,
    isLoading,
    onRetry,
    showHeading = true,
}) => {
    const { t } = useTranslation();
    const headingId = "transactions-account-balances-heading";

    return (
        <section
            aria-label={showHeading ? undefined : t("transactions.accountBalances")}
            aria-labelledby={showHeading ? headingId : undefined}
            className="transactions-account-balances"
            data-qa="account-balances-companion"
        >
            {showHeading && <h2 id={headingId}>{t("transactions.accountBalances")}</h2>}
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
                    {t("transactions.accountBalancesEmpty")}
                </div>
            ) : (
                <ul className="transactions-account-balances__list">
                    {accounts.map(account => (
                        <li key={account.id}>
                            <span className="transactions-account-balances__name">{account.name}</span>
                            <Num currency={account.currency} kind="neutral" signage="signed" value={account.value} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default AccountBalancesCompanion;
