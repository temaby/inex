import * as React from 'react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Drawer, Grid, Pagination, Spin, Table, Tag, Typography } from 'antd';
import { CalendarOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigate } from "react-router-dom";
import type { TableColumnsType } from "antd";

import { CategoryDetails } from '../../model/Category/CategoryDetails';
import { fetchTransactions } from '../../store/transactions/transactions-actions';
import TransactionEditForm from './TransactionEditForm';
import { buildSingleTagOrRefFilterSearch } from './transaction-filter-url';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const headerSpan = { colSpan: 0 };
const HEADER_COLSPAN = 100;

const TransactionList = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const transactions = useAppSelector(state => state.transactions.items);
    const transactionsLastUpdate = useAppSelector(state => state.transactions.lastUpdate);
    const total = useAppSelector(state => state.transactions.total);
    const filter = useAppSelector(state => state.transactions.filter);
    const isLoading = useAppSelector(state => state.transactions.isLoading);

    const [pagination, setPagination] = useState({ current: 1, total: 0, size: 25 });
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [mobileEditRecord, setMobileEditRecord] = useState<any>(null);

    const isMobile = screens.md === false;
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
        navigate(`../../transactions${buildSingleTagOrRefFilterSearch("tags", tag)}`, { replace: false });
    };

    const handleRefClick = (ref: string) => {
        navigate(`../../transactions${buildSingleTagOrRefFilterSearch("refs", ref)}`, { replace: false });
    };

    // Shared helpers used by both desktop columns and mobile cards

    const dateHeaderLabel = (date: string) => {
        const d = dayjs(date);
        return d.year() === dayjs().year()
            ? d.format("dddd, D MMM")
            : d.format("dddd, D MMM YYYY");
    };

    const getAmountDisplay = (record: any) => {
        const account = props.accounts.find((a: any) => a.id === record.accountId);
        const category = props.categories.find((c: CategoryDetails) => c.id === record.categoryId);
        const isTransfer = category?.isSystem ?? false;
        const abs = (Math.round(Math.abs(record.amount) * 100) / 100).toFixed(2);
        const sign = record.amount >= 0 ? "+" : "-";
        const color = isTransfer ? "#8c8c8c" : record.amount >= 0 ? "#52c41a" : "#ff4d4f";
        return { label: `${sign}${abs} ${account?.currency ?? ''}`, color };
    };

    const renderNotes = (record: any, stopProp = false) => {
        const hasTags = record.tags?.length > 0 || record.refs?.length > 0;
        const clean = record.comment?.replace(/#\S+/g, '').replace(/@\S+/g, '').trim();
        const wrap = (fn: (v: string) => void, val: string) =>
            (e: React.MouseEvent) => { if (stopProp) e.stopPropagation(); fn(val); };
        return (
            <>
                {record.tags?.map((tag: any) => (
                    <Tag color="green" key={tag} style={{ cursor: "pointer" }} onClick={wrap(handleTagClick, tag)}>
                        {tag.toUpperCase()}
                    </Tag>
                ))}
                {record.refs?.map((ref: any) => (
                    <Tag color="geekblue" key={ref} style={{ cursor: "pointer" }} onClick={wrap(handleRefClick, ref)}>
                        {ref.toUpperCase()}
                    </Tag>
                ))}
                {clean && (
                    <span style={{ color: hasTags ? "#8c8c8c" : "inherit" }}>{clean}</span>
                )}
            </>
        );
    };

    const paginationBar = (
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
    );

    // Mobile card layout
    if (isMobile) {
        return (
            <>
                <Drawer
                    open={mobileEditRecord !== null}
                    onClose={() => setMobileEditRecord(null)}
                    placement="bottom"
                    height="85%"
                    title={null}
                    styles={{ body: { padding: 16, overflowY: "auto" } }}
                >
                    {mobileEditRecord && (
                        <TransactionEditForm
                            record={mobileEditRecord}
                            accounts={props.accounts}
                            categories={props.categories}
                        />
                    )}
                </Drawer>

                <Spin spinning={isLoading}>
                    <div style={{ background: "white" }}>
                        {dataSource.map(record => {
                            if (record._isDateHeader) {
                                return (
                                    <div
                                        key={record.id}
                                        style={{
                                            backgroundColor: "#f0f5ff",
                                            borderTop: "2px solid #e8e8e8",
                                            padding: "8px 16px",
                                            fontSize: 12,
                                            color: "#595959",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <CalendarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
                                        {dateHeaderLabel(record._date)}
                                    </div>
                                );
                            }

                            const category = props.categories.find((c: CategoryDetails) => c.id === record.categoryId);
                            const account = props.accounts.find((a: any) => a.id === record.accountId);
                            const { label: amountLabel, color: amountColor } = getAmountDisplay(record);
                            const hasNotes = record.tags?.length > 0 || record.refs?.length > 0 || record.comment;

                            return (
                                <div
                                    key={record.id}
                                    onClick={() => setMobileEditRecord(record)}
                                    style={{
                                        padding: "12px 16px",
                                        borderBottom: "1px solid #f0f0f0",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                        <Text strong style={{ fontSize: 15, flex: 1 }} ellipsis>{category?.name}</Text>
                                        <Text style={{ color: amountColor, fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
                                            {amountLabel}
                                        </Text>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{account?.name}</Text>
                                    {hasNotes && (
                                        <div style={{ marginTop: 4, fontSize: 12 }}>
                                            {renderNotes(record, true)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Spin>

                {paginationBar}
            </>
        );
    }

    // Desktop table layout
    const renderDateHeader = (record: any) => ({
        children: (
            <span style={{ fontSize: 12, color: "#595959", fontWeight: 600 }}>
                <CalendarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
                {dateHeaderLabel(record._date)}
            </span>
        ),
        props: { colSpan: HEADER_COLSPAN },
    });

    const columns: TableColumnsType<any> = [
        {
            title: t("transactions.category"),
            width: "28%",
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
            width: "22%",
            dataIndex: "accountId",
            key: "accountId",
            render: (accountId: number, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                const account = props.accounts.find((a: any) => a.id === accountId);
                return account?.name;
            },
        },
        {
            title: t("transactions.amount"),
            key: "amount",
            width: "16%",
            align: "right",
            render: (_: string, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                const { label, color } = getAmountDisplay(record);
                return <span style={{ color }}>{label}</span>;
            },
        },
        {
            title: t("transactions.comment"),
            key: "notes",
            width: "34%",
            render: (_: any, record: any) => {
                if (record._isDateHeader) return { children: null, props: headerSpan };
                return <span>{renderNotes(record)}</span>;
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
            {paginationBar}
        </>
    );
};

export default TransactionList;
