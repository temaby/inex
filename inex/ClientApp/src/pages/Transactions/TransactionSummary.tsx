import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Typography, Divider, Tooltip } from 'antd';
import { fetchTransactionsSummaryForAccounts } from '../../store/transactions/transactions-actions';

const { Text, Title } = Typography;

const fmt = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

const TransactionSummary = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const accountsDetails = useAppSelector(state => state.transactions.summaryItems);
    const transactionsLastUpdate = useAppSelector(state => state.transactions.lastUpdate);
    const exchangeRates = useAppSelector(state => state.rates.items);

    const { accounts } = props;

    const baseCurrency: string = exchangeRates[0]?.currencyFrom ?? '';

    const toBase = (value: number, currency: string): number => {
        if (!baseCurrency || currency === baseCurrency) return value;
        const rate = exchangeRates.find((r: any) => r.currencyTo === currency);
        return rate ? value / rate.rate : value;
    };

    const grouped = useMemo(() => {
        const groups: Record<string, any[]> = {};
        for (const item of accountsDetails) {
            if (!groups[item.currency]) groups[item.currency] = [];
            groups[item.currency].push(item);
        }
        return groups;
    }, [accountsDetails]);

    const total = useMemo(
        () => accountsDetails.reduce((sum: number, item: any) => sum + toBase(item.value, item.currency), 0),
        [accountsDetails, exchangeRates]
    );

    const thisMonthNet = useMemo(
        () => accountsDetails.reduce((sum: number, item: any) => sum + toBase(item.thisMonthNet ?? 0, item.currency), 0),
        [accountsDetails, exchangeRates]
    );

    const lastMonthTotal = total - thisMonthNet;
    const momPercent = lastMonthTotal !== 0 && Number.isFinite(thisMonthNet)
        ? (thisMonthNet / Math.abs(lastMonthTotal)) * 100
        : null;

    const currencyCount = Object.keys(grouped).length;
    const accountCount = accountsDetails.length;

    useEffect(() => {
        const accountIds = accounts.map((i: any) => i.id);
        dispatch(fetchTransactionsSummaryForAccounts(accountIds));
    }, [accounts, transactionsLastUpdate]);

    return (
        <div>
            <div style={{ padding: '16px 16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Title level={4} style={{ margin: 0 }}>
                        {fmt(total)} {baseCurrency}
                    </Title>
                    {momPercent !== null && (
                        <Tooltip title={t('transactions.summaryMomTooltip')}>
                            <Text style={{ fontSize: 12, color: momPercent >= 0 ? '#52c41a' : '#ff4d4f', cursor: 'default' }}>
                                {momPercent >= 0 ? '+' : ''}{fmt(momPercent)}%
                            </Text>
                        </Tooltip>
                    )}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('transactions.summaryAcross', { accounts: accountCount, currencies: currencyCount })}
                </Text>
            </div>
            <Divider style={{ margin: 0 }} />

            {Object.entries(grouped).map(([currency, items]) => {
                const subtotal = items.reduce((sum: number, i: any) => sum + i.value, 0);
                const isBase = !baseCurrency || currency === baseCurrency;
                const headerValue = isBase
                    ? `${fmt(subtotal)} ${currency}`
                    : `≈ ${fmt(toBase(subtotal, currency))} ${baseCurrency}`;

                return (
                    <div key={currency}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 16px 2px' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{currency}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{headerValue}</Text>
                        </div>

                        {items.map((item: any) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 16px' }}>
                                <Text style={{ flex: 1, marginRight: 8 }}>{item.name}</Text>
                                <span style={{ color: item.value < 0 ? '#ff4d4f' : 'inherit' }}>
                                    {fmt(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export default TransactionSummary;
