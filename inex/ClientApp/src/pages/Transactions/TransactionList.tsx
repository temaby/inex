import * as React from 'react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Pagination, Table, Tag } from 'antd';
import { CalendarOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigate } from "react-router-dom";
import type { TableColumnsType } from "antd";

import { CategoryDetails } from '../../model/Category/CategoryDetails';

import { fetchTransactions } from '../../store/transactions/transactions-actions';
import TransactionEditForm from './TransactionEditForm';

const headerSpan = { colSpan: 0 };
const HEADER_COLSPAN = 100; // spans all columns regardless of count

const TransactionList = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const transactions = useAppSelector(state => state.transactions.items);
    const transactionsLastUpdate = useAppSelector(state => state.transactions.lastUpdate);
    const total = useAppSelector(state => state.transactions.total);
    const filter = useAppSelector(state => state.transactions.filter);
    const isLoading = useAppSelector(state => state.transactions.isLoading);

    const [pagination, setPagination] = useState({ current: 1, total: 0, size: 25 });
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const { categories, accounts } = props;
    const { size: pageSize, current: currentPage } = pagination;

    const dataSource = useMemo(() => {
        const result: any[] = [];
        let lastDate: string | null = null;
        for (const tx of transactions) {
            const txDate = dayjs(tx.created).format("YYYY-MM-DD");
            if (txDate !== lastDate) {
                result.push({ _isDateHeader: true, _date: tx.created, id: `_h_${txDate}` });
                lastDate = txDate;
            }
            result.push(tx);
        }
        return result;
    }, [transactions]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, total }));
    }, [total]);

    useEffect(() => {
        if (accounts.length === 0 || categories.length === 0) return;
        dispatch(fetchTransactions(pageSize, currentPage, filter));
        setExpandedRows([]);
    }, [categories, accounts, pageSize, currentPage, filter, transactionsLastUpdate]);

    const paginationChangedHandler = (page: number, pageSize: number) => {
        setPagination(prev => {
            if (prev.size !== pageSize) page = 1;
            return { ...prev, current: page, size: pageSize };
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const rowExpandHandler = (expanded: boolean, record: any) => {
        setExpandedRows(expanded && record ? [record.id.toString()] : []);
    };

    const handleTagClick = (tag: string) => {
        navigate(`../../transactions?filter=tags:${tag};`, { replace: false });
    };

    const handleRefClick = (ref: string) => {
        navigate(`../../transactions?filter=refs:${ref};`, { replace: false });
    };

    const renderDateHeader = (record: any) => {
        const d = dayjs(record._date);
        const label = d.year() === dayjs().year()
            ? d.format("dddd, D MMM")
            : d.format("dddd, D MMM YYYY");
        return {
            children: (
                <span style={{ fontSize: 12, color: "#595959", fontWeight: 600 }}>
                    <CalendarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
                    {label}
                </span>
            ),
            props: { colSpan: HEADER_COLSPAN },
        };
    };

    const columns: TableColumnsType<any> = [
        {
            title: t("transactions.category"),
            width: "24%",
            dataIndex: "categoryId",
            key: "categoryId",
            render: (categoryId: number, record: any) => {
                if (record._isDateHeader) return renderDateHeader(record);
                const category = props.categories.find((c: CategoryDetails) => c.id === categoryId);
                return category?.name;
            },
        },
        {
            title: t("transactions.account"),
            width: "20%",
            dataIndex: "accountId",
            key: "accountId",
            render: (accountId: number, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                const account = props.accounts.find((a: any) => a.id === accountId);
                return account?.name;
            },
        },
        {
            title: "",
            key: "tagrefitems",
            width: "15%",
            render: (text: any, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                return (
                    <span style={{ cursor: "pointer" }}>
                        {record.tags.map((tag: any) => (
                            <Tag color="green" key={tag} onClick={() => handleTagClick(tag)}>
                                {tag.toUpperCase()}
                            </Tag>
                        ))}
                        {record.refs.map((ref: any) => (
                            <Tag color="geekblue" key={ref} onClick={() => handleRefClick(ref)}>
                                {ref.toUpperCase()}
                            </Tag>
                        ))}
                    </span>
                );
            },
        },
        {
            title: t("transactions.amount"),
            key: "amount",
            width: "16%",
            align: "right",
            render: (text: string, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                const account = props.accounts.find((a: any) => a.id === record.accountId);
                const category = props.categories.find((c: CategoryDetails) => c.id === record.categoryId);
                const isTransfer = category?.isSystem ?? false;
                const abs = (Math.round(Math.abs(record.amount) * 100) / 100).toFixed(2);
                const sign = record.amount >= 0 ? "+" : "-";
                const color = isTransfer ? "#8c8c8c" : record.amount >= 0 ? "#52c41a" : "#ff4d4f";
                return <span style={{ color }}>{sign}{abs} {account?.currency}</span>;
            },
        },
        {
            title: t("transactions.comment"),
            key: "comment",
            dataIndex: "comment",
            width: "25%",
            render: (comment: string, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                return comment;
            },
        },
    ];

    const expandedRowRender = (record: any) =>
        <TransactionEditForm record={record} accounts={props.accounts} categories={props.categories} />;

    return (
        <>
            <Table
                rowKey={(record: any) => record.id.toString()}
                loading={isLoading}
                columns={columns}
                dataSource={dataSource}
                onRow={(record) => ({
                    style: record._isDateHeader
                        ? { backgroundColor: "#f0f5ff", cursor: "default", borderTop: "2px solid #e8e8e8" }
                        : undefined,
                })}
                expandable={{
                    expandedRowRender,
                    rowExpandable: (record) => !record._isDateHeader,
                    showExpandColumn: false,
                    expandRowByClick: true,
                    onExpand: rowExpandHandler,
                    expandedRowKeys: expandedRows,
                }}
                pagination={false}
                tableLayout="fixed"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <Pagination
                    current={pagination.current}
                    pageSize={pagination.size}
                    total={pagination.total}
                    onChange={paginationChangedHandler}
                    showSizeChanger
                    pageSizeOptions={[25, 50, 100]}
                />
            </div>
        </>
    );
};

export default TransactionList;
