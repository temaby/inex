import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Col, DatePicker, Form, Input, Row } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

import Dropdown from "../../components/Dropdown";
import { defaultCategory, CategoryDetails, createCategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import { defaultAccount } from "../../model/Account/AccountDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { transactionsDefaultFilter, transactionsActions } from "../../store/transactions/transactions-slice";
import type { TransactionFilter } from "../../store/transactions/transactions-slice";
import { useAppDispatch } from "../../store/hooks";
import { buildTransactionFilterSearch, parseTransactionFilterParam } from "./transaction-filter-url";
import type { LedgerUiFilter } from "./transaction-ledger-utils";

const { RangePicker } = DatePicker;

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];
type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

interface TransactionFilterFormProps {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    filter: string | null;
    ledgerFilter: LedgerUiFilter;
    onLedgerFilterChange: React.Dispatch<React.SetStateAction<LedgerUiFilter>>;
}

const hasActiveTransactionFilter = (filter: TransactionFilter): boolean =>
    filter.categoryIds.some((id) => id > 0) ||
    filter.accountIds.some((id) => id > 0) ||
    filter.tags.some((tag) => tag !== "") ||
    filter.refs.some((ref) => ref !== "") ||
    filter.range.length === 2;

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

    useEffect(() => {
        const queryFilter = parseTransactionFilterParam(filter);

        if (!queryFilter) {
            dispatch(transactionsActions.resetFilter());
            setLocalFilter(transactionsDefaultFilter);
            setTagsAndRefsInput("");
            return;
        }

        setLocalFilter(queryFilter);
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
        () => getCategoriesTree(categories.map(toCategoryDetails), false, t("categories.systemGroup")) as CategoryDetails[],
        [categories, t],
    );

    const filterDetails = useMemo(() => {
        const filteredCategories = categories.filter((category) =>
            localFilter.categoryIds.includes(category.id),
        );
        const filteredAccounts = accounts.filter((account) =>
            localFilter.accountIds.includes(account.id),
        );
        const range = localFilter.range.length === 2
            ? [dayjs.unix(localFilter.range[0]), dayjs.unix(localFilter.range[1])] as [Dayjs, Dayjs]
            : null;

        const tags = localFilter.tags.map((tag) => `#${tag}`).join(" ");
        const refs = localFilter.refs.map((ref) => `@${ref}`).join(" ");
        const combinedTagsAndRefs = [tags, refs].filter(Boolean).join(" ");

        return {
            accounts: filteredAccounts.length === 0 ? [defaultAccount] : filteredAccounts,
            categories: filteredCategories.length === 0 ? [defaultCategory] : filteredCategories.map(toCategoryDetails),
            tagsAndRefs: tagsAndRefsInput || combinedTagsAndRefs,
            range,
        };
    }, [accounts, categories, localFilter, tagsAndRefsInput]);

    const amountFilterActive = ledgerFilter.minAmount.trim() !== "" || ledgerFilter.maxAmount.trim() !== "";
    const filterActive = hasActiveTransactionFilter(localFilter) || amountFilterActive;

    const setAccountsHandler = (item: DropdownSelectInfo) => {
        setLocalFilter((prevState) => ({
            ...prevState,
            accountIds: item.selectedKeys
                .map((key) => Number(key))
                .filter((id) => id > 0),
        }));
    };

    const setCategoriesHandler = (item: DropdownSelectInfo) => {
        setLocalFilter((prevState) => ({
            ...prevState,
            categoryIds: item.selectedKeys
                .map((key) => Number(key))
                .filter((id) => id > 0),
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

    const setRangeHandler = (dates: DateRangeValue) => {
        setLocalFilter((prevState) => ({
            ...prevState,
            range: dates?.[0] && dates[1]
                ? [dates[0].startOf("day").unix(), dates[1].endOf("day").unix()]
                : [],
        }));
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
        dispatch(transactionsActions.resetFilter());
        setLocalFilter(transactionsDefaultFilter);
        setTagsAndRefsInput("");
        onLedgerFilterChange((prevState) => ({
            ...prevState,
            minAmount: "",
            maxAmount: "",
        }));
        navigate(location.pathname, { replace: true });
    };

    const applyFilterHandler = () => {
        navigate(`${location.pathname}${buildTransactionFilterSearch(localFilter)}`, { replace: true });
    };

    const rangePresets = useMemo((): Record<string, [Dayjs, Dayjs]> => ({
        [t("transactions.last7Days")]: [dayjs().subtract(7, "day").startOf("day"), dayjs().endOf("day")],
        [t("transactions.last30Days")]: [dayjs().subtract(30, "day").startOf("day"), dayjs().endOf("day")],
        [t("transactions.lastMonth")]: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")],
        [t("transactions.thisMonth")]: [dayjs().startOf("month"), dayjs().endOf("day")],
    }), [t]);

    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.dateRange")}>
                        <RangePicker
                            id="filter_range"
                            bordered={false}
                            inputReadOnly
                            onChange={setRangeHandler}
                            ranges={rangePresets}
                            value={filterDetails.range}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.account")}>
                        <Dropdown
                            id="filter_account"
                            selection={filterDetails.accounts}
                            onChange={setAccountsHandler}
                            items={accounts}
                            multiple
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.category")}>
                        <Dropdown
                            id="filter_category"
                            selection={filterDetails.categories}
                            onChange={setCategoriesHandler}
                            items={categoryTree}
                            multiple
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.tagsAndRefs")}>
                        <Input
                            id="filter_tags_refs"
                            placeholder="#tag @ref"
                            onChange={setTagsAndRefsHandler}
                            value={filterDetails.tagsAndRefs}
                            size="large"
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Form.Item label={t("transactions.minAmountEquivalent")}>
                        <Input
                            id="transactions-min-amount"
                            onChange={setMinAmountHandler}
                            placeholder="0.00"
                            value={ledgerFilter.minAmount}
                            size="large"
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label={t("transactions.maxAmountEquivalent")}>
                        <Input
                            id="transactions-max-amount"
                            onChange={setMaxAmountHandler}
                            placeholder={t("transactions.anyAmount")}
                            value={ledgerFilter.maxAmount}
                            size="large"
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12} style={{ textAlign: "center" }}>
                    <Form.Item>
                        <Button block disabled={!filterActive} onClick={resetFilterHandler}>
                            {t("transactions.resetFilter")}
                        </Button>
                    </Form.Item>
                </Col>
                <Col span={12} style={{ textAlign: "center" }}>
                    <Form.Item>
                        <Button block type="primary" disabled={!filterActive} onClick={applyFilterHandler}>
                            {t("transactions.applyFilter")}
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionFilterForm;
