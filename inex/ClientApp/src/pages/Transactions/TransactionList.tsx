import * as React from 'react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { ColumnsType } from "antd/es/table";

import { CategoryDetails } from '../../model/Category/CategoryDetails';

import { fetchTransactions } from '../../store/transactions/transactions-actions';
import TransactionEditForm from './TransactionEditForm';

const TransactionList = (props: any) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const transactions = useSelector((state: any) => state.transactions.items);
    const transactionsLastUpdate = useSelector((state: any) => state.transactions.lastUpdate);
    const total = useSelector((state: any) => state.transactions.total);
    const filter = useSelector((state: any) => state.transactions.filter);
    const isLoading = useSelector((state: any) => state.transactions.isLoading);

    const [pagination, setPagination] = useState({ current: 1, total: 0, size: 20 });
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const { categories, accounts } = props;
    const { size: pageSize, current: currentPage } = pagination;

    useEffect(() => {
        setPagination((prevState: any) => {
            return { ...prevState, total: total };
        });
    }, [total]);

    useEffect(() => {
        if (accounts.length === 0 || categories.length === 0) {
            return;
        }

        dispatch(fetchTransactions(pageSize, currentPage, filter));
        setExpandedRows([]);
    }, [categories, accounts, pageSize, currentPage, filter, transactionsLastUpdate]);

    const paginationChangedHandler = (page: number, pageSize: number) => {
        setPagination((prevState: any) => {
            if (prevState.size !== pageSize) {
                page = 1;
            }
            return { ...prevState, current: page, size: pageSize };
        });
    };

    const rowExpandHandler = (expanded: boolean, record: any) => {
        if (expanded) {
            setExpandedRows(record ? [record.id.toString()] : []);
        } else {
            setExpandedRows([]);
        }
    };

    const handleTagClick = (tag: string) => {
        navigate(`../../transactions?filter=tags:${tag};`, { replace: false });
    };

    const handleRefClick = (ref: string) => {
        navigate(`../../transactions?filter=refs:${ref};`, { replace: false });
    };

    const columns: ColumnsType<any> = [
        {
            title: "Дата",
            dataIndex: "created",
            key: "created",
            width: 120,
            render: (date: any) => {
                return moment(date).format("YYYY-MM-DD");
            },
        },
        {
            title: "Категория",
            width: 220,
            dataIndex: "categoryId",
            key: "categoryId",
            render: (categoryId: number) => {
                const category = props.categories.find(
                    (category: CategoryDetails) => category.id === categoryId
                );
                return category.name;
            },
        },
        {
            title: "Счет",
            width: 200,
            dataIndex: "accountId",
            key: "accountId",
            render: (accountId: number) => {
                const account = props.accounts.find(
                    (account: CategoryDetails) => account.id === accountId
                );
                return account.name;
            },
        },
        {
            title: "",
            key: "tagrefitems",
            render: (text: any, item: any) => {
                return (
                    <span style={{ cursor: "pointer" }}>
                        {item.tags.map((tag: any) => {
                            let color = "green";
                            return (
                                <Tag color={color} key={tag} onClick={() => handleTagClick(tag)}>
                                    {tag.toUpperCase()}
                                </Tag>
                            );
                        })}
                        {item.refs.map((ref: any) => {
                            let color = "geekblue";
                            return (
                                <Tag color={color} key={ref} onClick={() => handleRefClick(ref)}>
                                    {ref.toUpperCase()}
                                </Tag>
                            );
                        })}
                    </span>
                );
            },
        },
        {
            title: "Сумма",
            key: "amount",
            width: 170,
            align: "right",
            render: (text: string, item: any) => {
                let textColor = item.amount > 0 ? "green" : "red";
                const account = props.accounts.find(
                    (account: CategoryDetails) => account.id === item.accountId
                );
                return (
                    <span style={{ color: textColor }}>
                        {(Math.round((item.amount > 0 ? item.amount : 0 - item.amount) * 100) / 100).toFixed(2)}{" "}{account.currency}
                    </span>
                );
            },
        },
        {
            title: "Комментарий",
            dataIndex: "comment",
            key: "comment",
        }
    ];

    const expandedRowRender = (record: any) => {
        return <TransactionEditForm record={record} accounts={props.accounts} categories={props.categories} />;
    };

    return (
        <Table
            rowKey={(record: any) => record.id.toString()}
            loading={isLoading}
            columns={columns}
            dataSource={transactions}
            expandable={{
                expandedRowRender: expandedRowRender,
                rowExpandable: () => true,
                showExpandColumn: false,
                expandRowByClick: true,
                onExpand: rowExpandHandler,
                expandedRowKeys: expandedRows
            }}
            pagination={{
                pageSize: pagination.size,
                onChange: paginationChangedHandler,
                current: pagination.current,
                total: pagination.total,
            }}
            sticky
            />
    );
};

export default TransactionList;