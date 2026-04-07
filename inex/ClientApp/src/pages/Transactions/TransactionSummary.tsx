import * as React from 'react';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from "../../store/hooks";

import { Table, Typography } from 'antd';

const { Text } = Typography

import { fetchTransactionsSummaryForAccounts } from '../../store/transactions/transactions-actions';

const columns = [
    {
        title: '',
        dataIndex: 'name',
        key: 'name'
    },
    {
        title: '',
        dataIndex: 'value',
        key: 'value',
        width: 100,
        render: (value: any) => {
            let textColor = value > 0 ? 'green' : 'red';
            return (
                <span style={{ color: textColor }}>
                    {(Math.round((value) * 100) / 100).toFixed(2)}
                </span>
            );
        }
    }
];

const TransactionSummary = (props: any) => {
  const dispatch = useAppDispatch();

  const accountsDetails = useAppSelector(state => state.transactions.summaryItems);
  const transactionsLastUpdate = useAppSelector(state => state.transactions.lastUpdate);
  const exchangeRates = useAppSelector(state => state.rates.items);

  const { accounts } = props;

  const accountsDetailsUSD = accountsDetails.map((i: any) => {
    const exchangeRate = exchangeRates.find((rate: any) => rate.currencyTo === i.currency);
    return exchangeRate ? i.value / exchangeRate.rate : i.value;
  });

  const total = accountsDetailsUSD.reduce((partialSum:number, a: number) => partialSum + a, 0);

  useEffect(() => {
    const accountIds = accounts.map((i: any) => i.id);
    dispatch(fetchTransactionsSummaryForAccounts(accountIds));
  }, [accounts, transactionsLastUpdate]);

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={accountsDetails}
      pagination={false}
      showHeader={false}
      summary={() => (
        <Table.Summary>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Text strong>Итого USD</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Text strong>{(Math.round(total * 100) / 100).toFixed(2)}</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};;

export default TransactionSummary;