import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Select } from "antd";
import dayjs from "dayjs";

import { InExButton } from "../../components/primitives";
import { CategoryDetails, createCategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { normalizeTransactionFilter, transactionsDefaultFilter, type NormalizedTransactionFilter } from "../../store/transactions/transactions-slice";
import { getCurrentTransactionMonthRange } from "./transaction-ledger-utils";

type FlatCategory = Omit<CategoryDetails, "children"> & { depth: number };

interface TransactionFilterFormProps {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    filter: NormalizedTransactionFilter;
    onApply: (filter: NormalizedTransactionFilter) => void;
}

const createCurrentMonthFilter = (): NormalizedTransactionFilter => normalizeTransactionFilter({
    ...transactionsDefaultFilter,
    range: getCurrentTransactionMonthRange(),
});

const toDateInputValue = (timestamp: number | undefined): string =>
    timestamp && timestamp > 0 ? dayjs.unix(timestamp).format("YYYY-MM-DD") : "";

const toCategoryDetails = (category: CategoryResponse): CategoryDetails =>
    createCategoryDetails({
        id: category.id,
        key: category.key,
        name: category.name,
        description: category.description ?? "",
        parentId: category.parentId ?? undefined,
        isEnabled: category.isEnabled,
        isSystem: category.isSystem,
        systemCode: category.systemCode ?? "",
        children: [],
    });

const TransactionFilterForm: React.FC<TransactionFilterFormProps> = ({ accounts, categories, filter, onApply }) => {
    const { t } = useTranslation();
    const [localFilter, setLocalFilter] = useState(filter);
    const [tagsAndRefsInput, setTagsAndRefsInput] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        setLocalFilter(filter);
        setFromDate(toDateInputValue(filter.range[0]));
        setToDate(toDateInputValue(filter.range[1]));
        setTagsAndRefsInput([
            filter.tags.map((tag) => `#${tag}`).join(" "),
            filter.refs.map((ref) => `@${ref}`).join(" "),
        ].filter(Boolean).join(" "));
    }, [filter]);

    const categoryTree = useMemo(
        () => getCategoriesTree(categories.map(toCategoryDetails), true, t("categories.systemGroup")) as FlatCategory[],
        [categories, t],
    );
    const accountOptions = useMemo(() => accounts.map((account) => ({ label: account.name, title: account.name, value: account.id })), [accounts]);
    const categoryOptions = useMemo(() => categoryTree.map((category) => ({
        disabled: category.id <= 0,
        label: <span className="transactions-filter-option" style={{ paddingLeft: category.depth * 12 }}>{category.name}</span>,
        title: category.name,
        value: category.id,
    })), [categoryTree]);

    const setSelectedIds = (ids: number[], key: "accountIds" | "categoryIds") => {
        setLocalFilter((previous) => normalizeTransactionFilter({ ...previous, [key]: ids }));
    };

    const setTagsAndRefs = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target.value;
        const tags = Array.from(input.matchAll(/#(\S+)/g), (match) => match[1]);
        const refs = Array.from(input.matchAll(/@(\S+)/g), (match) => match[1]);
        setTagsAndRefsInput(input);
        setLocalFilter((previous) => normalizeTransactionFilter({ ...previous, tags, refs }));
    };

    const setDateRange = (nextFrom: string, nextTo: string) => {
        const start = nextFrom ? dayjs(nextFrom).startOf("day") : null;
        const end = nextTo ? dayjs(nextTo).endOf("day") : null;
        setLocalFilter((previous) => normalizeTransactionFilter({
            ...previous,
            range: start?.isValid() && end?.isValid() && start.unix() <= end.unix() ? [start.unix(), end.unix()] : [],
        }));
    };

    return (
        <Form className="transactions-filter-form" hideRequiredMark layout="vertical">
            <div className="transactions-filter-form__date-grid">
                <Form.Item label={t("transactions.from")}>
                    <input className="transactions-native-input" id="filter_from" onChange={(event) => {
                        setFromDate(event.target.value);
                        setDateRange(event.target.value, toDate);
                    }} type="date" value={fromDate} />
                </Form.Item>
                <Form.Item label={t("transactions.to")}>
                    <input className="transactions-native-input" id="filter_to" onChange={(event) => {
                        setToDate(event.target.value);
                        setDateRange(fromDate, event.target.value);
                    }} type="date" value={toDate} />
                </Form.Item>
            </div>
            <Form.Item label={t("transactions.account")}>
                <Select aria-label={t("transactions.account")} className="transactions-multi-select" id="filter_account" mode="multiple" onChange={(ids) => setSelectedIds(ids, "accountIds")} optionFilterProp="title" options={accountOptions} placeholder={t("transactions.allAccounts")} value={localFilter.accountIds} />
            </Form.Item>
            <Form.Item label={t("transactions.category")}>
                <Select aria-label={t("transactions.category")} className="transactions-multi-select" id="filter_category" mode="multiple" onChange={(ids) => setSelectedIds(ids, "categoryIds")} optionFilterProp="title" options={categoryOptions} placeholder={t("transactions.allCategories")} value={localFilter.categoryIds} />
            </Form.Item>
            <Form.Item label={t("transactions.keyword")}>
                <Input id="filter_tags_refs" onChange={setTagsAndRefs} placeholder={t("transactions.keywordPlaceholder")} size="large" value={tagsAndRefsInput} />
            </Form.Item>
            <div className="transactions-drawer-actions">
                <InExButton kind="default" onClick={() => onApply(createCurrentMonthFilter())}>{t("transactions.clearAll")}</InExButton>
                <InExButton kind="primary" onClick={() => onApply(localFilter)}>{t("transactions.applyFilters")}</InExButton>
            </div>
        </Form>
    );
};

export default TransactionFilterForm;
