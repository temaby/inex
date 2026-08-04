import * as React from "react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { AccountSummary } from "../../store/accounts/accounts-api";

interface SelectedAccountNativeBalanceProps {
    accountId: number;
    summaries: AccountSummary[];
}

const SelectedAccountNativeBalance: React.FC<SelectedAccountNativeBalanceProps> = ({ accountId, summaries }) => {
    const { t } = useTranslation();
    const summary = summaries.find((candidate) => candidate.id === accountId);

    if (!summary) return null;

    return (
        <div className="transactions-selected-account-balance" data-qa="selected-account-native-balance" data-testid="selected-account-native-balance">
            <span>{t("transactions.nativeBalance")}</span>
            <Num currency={summary.currency} kind="neutral" signage="signed" value={summary.value} />
        </div>
    );
};

export default SelectedAccountNativeBalance;
