import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Select } from "antd";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

import { InExButton } from "../../components/primitives";
import { CategoryDetails, createCategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { transactionsDefaultFilter, transactionsActions } from "../../store/transactions/transactions-slice";
import type { TransactionFilter } from "../../store/transactions/transactions-slice";
import { useAppDispatch } from "../../store/hooks";
import { buildTransactionFilterSearch, parseTransactionFilterParam } from "./transaction-filter-url";
import { getCurrentTransactionMonthRange, type LedgerUiFilter } from "./transaction-ledger-utils";

type FlatCategory = Omit<CategoryDetails, "children"> & { depth: number };

interface TransactionFilterFormProps {
    accounts: AccountResponse[];
    baseCurrency: string;
    categories: CategoryResponse[];
    filter: string | null;
    ledgerFilter: LedgerUiFilter;
    onLedgerFilterChange: React.Dispatch<React.SetStateAction<LedgerUiFilter>>;
}

const hasActiveTransactionFilter = (filter: TransactionFilter): boolean =>
    filter.categoryIds.some((id) => id > 0) ||
    filter.accountIds.some((id) => id > 0) ||
    filter.tags.some((tag) => tag !== "") ||
    filter.refs.some((ref) => ref !== "");

const createCurrentMonthFilter = (): TransactionFilter => ({
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

const TransactionFilterForm: React.FC<TransactionFilterFormProps> = ({
    accounts,
    baseCurrency,
    categories,
    filter,
    ledgerFilter,
    onLedgerFilterChange,
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const navigate = useNavigate();

    const [localFilter, setLocalFilter] = useState<TransactionFilter>(transactionsDefaultFilter);
    const [tagsAndRefsInput, setTagsAndRefsInput] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        const queryFilter = parseTransactionFilterParam(filter);

        if (!queryFilter) {
            const monthFilter = createCurrentMonthFilter();
            dispatch(transactionsActions.setFilter({ filter: monthFilter }));
            setLocalFilter(monthFilter);
            setTagsAndRefsInput("");
            setFromDate(toDateInputValue(monthFilter.range[0]));
            setToDate(toDateInputValue(monthFilter.range[1]));
            return;
        }

        setLocalFilter(queryFilter);
        setFromDate(toDateInputValue(queryFilter.range[0]));
        setToDate(toDateInputValue(queryFilter.range[1]));
        setTagsAndRefsInput([
            queryFilter.tags.map((tag) => `#${tag}`).join(" "),
            queryFilter.refs.map((ref) => `@${ref}`).join(" "),
        ].filter(Boolean).join(" "));

        dispatch(
            transactionsActions.setFilter({
                filter: queryFilter,
            }),
        );
    }, [dispatch, filter]);

    const categoryTree = useMemo(
        () => getCategoriesTree(categories.map(toCategoryDetails), true, t("categories.systemGroup")) as FlatCategory[],
        [categories, t],
    );

    const filterDetails = useMemo(() => {
        const tags = localFilter.tags.map((tag) => `#${tag}`).join(" ");
        const refs = localFilter.refs.map((ref) => `@${ref}`).join(" ");
        const combinedTagsAndRefs = [tags, refs].filter(Boolean).join(" ");

        return {
            tagsAndRefs: tagsAndRefsInput || combinedTagsAndRefs,
        };
    }, [localFilter.refs, localFilter.tags, tagsAndRefsInput]);

    const amountFilterActive = ledgerFilter.minAmount.trim() !== "" || ledgerFilter.maxAmount.trim() !== "";
    const filterActive = hasActiveTransactionFilter(localFilter) || amountFilterActive;

    const accountOptions = useMemo(
        () => accounts.map((account) => ({
            label: account.name,
            title: account.name,
            value: account.id,
        })),
        [accounts],
    );

    const categoryOptions = useMemo(
        () => categoryTree.map((category) => ({
            disabled: category.id <= 0,
            label: (
                <span className="transactions-filter-option" style={{ paddingLeft: category.depth * 12 }}>
                    {category.name}
                </span>
            ),
            title: category.name,
            value: category.id,
        })),
        [categoryTree],
    );

    const setSelectedIds = (ids: number[], key: "accountIds" | "categoryIds") => {
        setLocalFilter((prevState) => ({
            ...prevState,
            [key]: ids.filter((id) => id > 0),
        }));
    };

    const setTagsAndRefsHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target.value;
        const tags: string[] = [];
        const refs: string[] = [];

        const tagRegex = /#(\S+)/g;
        const refRegex = /@(\S+)/g;

        let match: RegExpExecArray | null;
        while ((match = tagRegex.exec(input)) !== null) {
            tags.push(match[1]);
        }
        while ((match = refRegex.exec(input)) !== null) {
            refs.push(match[1]);
        }

        setLocalFilter((prevState) => ({
            ...prevState,
            tags,
            refs,
        }));
        setTagsAndRefsInput(input);
    };

    const setDateRange = (nextFrom: string, nextTo: string) => {
        const start = nextFrom ? dayjs(nextFrom).startOf("day") : null;
        const end = nextTo ? dayjs(nextTo).endOf("day") : null;
        setLocalFilter((prevState) => ({
            ...prevState,
            range: start?.isValid() && end?.isValid() && start.unix() <= end.unix()
                ? [start.unix(), end.unix()]
                : [],
        }));
    };

    const setFromDateHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFromDate(value);
        setDateRange(value, toDate);
    };

    const setToDateHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setToDate(value);
        setDateRange(fromDate, value);
    };

    const setMinAmountHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        onLedgerFilterChange((prevState) => ({
            ...prevState,
            minAmount: event.target.value,
        }));
    };

    const setMaxAmountHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        onLedgerFilterChange((prevState) => ({
            ...prevState,
            maxAmount: event.target.value,
        }));
    };

    const resetFilterHandler = () => {
        const monthFilter = createCurrentMonthFilter();
        dispatch(transactionsActions.setFilter({ filter: monthFilter }));
        setLocalFilter(monthFilter);
        setTagsAndRefsInput("");
        setFromDate(toDateInputValue(monthFilter.range[0]));
        setToDate(toDateInputValue(monthFilter.range[1]));
        onLedgerFilterChange((prevState) => ({
            ...prevState,
            minAmount: "",
            maxAmount: "",
        }));
        navigate(`${location.pathname}${buildTransactionFilterSearch(monthFilter)}`, { replace: true });
    };

    const applyFilterHandler = () => {
        navigate(`${location.pathname}${buildTransactionFilterSearch(localFilter)}`, { replace: true });
    };

    return (
        <Form className="transactions-filter-form" layout="vertical" hideRequiredMark>
            <div className="transactions-filter-form__date-grid">
                <Form.Item label={t("transactions.from")}>
                    <input
                        className="transactions-native-input"
                        id="filter_from"
                        onChange={setFromDateHandler}
                        type="date"
                        value={fromDate}
                    />
                </Form.Item>
                <Form.Item label={t("transactions.to")}>
                    <input
                        className="transactions-native-input"
                        id="filter_to"
                        onChange={setToDateHandler}
                        type="date"
                        value={toDate}
                    />
                </Form.Item>
            </div>

            <Form.Item label={t("transactions.account")}>
                <Select
                    aria-label={t("transactions.account")}
                    className="transactions-multi-select"
                    id="filter_account"
                    mode="multiple"
                    onChange={(ids) => setSelectedIds(ids, "accountIds")}
                    optionFilterProp="title"
                    options={accountOptions}
                    placeholder={t("transactions.allAccounts")}
                    value={localFilter.accountIds}
                />
            </Form.Item>

            <Form.Item label={t("transactions.category")}>
                <Select
                    aria-label={t("transactions.category")}
                    className="transactions-multi-select"
                    id="filter_category"
                    mode="multiple"
                    onChange={(ids) => setSelectedIds(ids, "categoryIds")}
                    optionFilterProp="title"
                    options={categoryOptions}
                    placeholder={t("transactions.allCategories")}
                    value={localFilter.categoryIds}
                />
            </Form.Item>

            <Form.Item label={t("transactions.keyword")}>
                <Input
                    id="filter_tags_refs"
                    onChange={setTagsAndRefsHandler}
                    placeholder={t("transactions.keywordPlaceholder")}
                    size="large"
                    value={filterDetails.tagsAndRefs}
                />
            </Form.Item>

            <Form.Item label={t("transactions.amountEquivalent")}>
                <div className="transactions-filter-form__amount-grid">
                    <Input
                        addonAfter={baseCurrency}
                        id="transactions-min-amount"
                        onChange={setMinAmountHandler}
                        placeholder={t("transactions.min")}
                        size="large"
                        value={ledgerFilter.minAmount}
                    />
                    <Input
                        addonAfter={baseCurrency}
                        id="transactions-max-amount"
                        onChange={setMaxAmountHandler}
                        placeholder={t("transactions.max")}
                        size="large"
                        value={ledgerFilter.maxAmount}
                    />
                </div>
            </Form.Item>

            <div className="transactions-drawer-actions" data-filter-active={filterActive}>
                <InExButton kind="default" onClick={resetFilterHandler}>
                    {t("transactions.clearAll")}
                </InExButton>
                <InExButton kind="primary" onClick={applyFilterHandler}>
                    {t("transactions.applyFilters")}
                </InExButton>
            </div>
        </Form>
    );
};

export default TransactionFilterForm;
