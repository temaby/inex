import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button, DatePicker, Input } from "antd";
import { Form, Col, Row } from "antd";
const { TextArea } = Input;

import moment from "moment";

const { RangePicker } = DatePicker;

import { useMemo, useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useLocation, useNavigate } from "react-router-dom";

import Dropdown from "../../components/Dropdown";
import { defaultCategory, CategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import { defaultAccount, AccountDetails } from "../../model/Account/AccountDetails";

import { transactionsDefaultFilter, transactionsActions } from "../../store/transactions/transactions-slice";

const TransactionFilterForm = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const navigate = useNavigate();

    const filterData = useAppSelector(state => state.transactions.filter);
    const [localFilter, setLocalFilter] = useState(transactionsDefaultFilter);
    const { categories, accounts, filter } = props;

    useEffect(() => {
        var queryFilter: { [id: string]: string[] } = {};

        if (filter) {
            filter.split(";").map((filterPart: string) => {
                const parts: string[] = filterPart.split(":");
                if (parts.length === 2) {
                    const key: string = parts[0];
                    const value: string[] = parts[1].split(",");
                    queryFilter[key] = value;
                }
            });
        }

        if (!queryFilter.accountIds && !queryFilter.categoryIds && (!queryFilter.start || !queryFilter.end) && !queryFilter.tags && !queryFilter.refs) {
            dispatch(transactionsActions.resetFilter());
            setLocalFilter(transactionsDefaultFilter);
        } else {
            let accountIds: number[] = [];
            let categoryIds: number[] = [];
            let tags: string[] = [];
            let refs: string[] = [];
            let range: [number, number] = [0, 0];

            if (queryFilter.accountIds) {
                accountIds = queryFilter.accountIds.map((i: string) => +i).filter((i: number) => i > 0);
                setLocalFilter((prevState: any) => ({ ...prevState, accountIds: accountIds }));
            }
            if (queryFilter.categoryIds) {
                categoryIds = queryFilter.categoryIds.map((i: string) => +i).filter((i: number) => i > 0);
                setLocalFilter((prevState: any) => ({ ...prevState, categoryIds: categoryIds }));
            }
            if (queryFilter.start && queryFilter.end) {
                range = [moment(queryFilter.start[0], "YYYY-MM-DD").unix(), moment(queryFilter.end[0], "YYYY-MM-DD").unix()];
                setLocalFilter((prevState: any) => ({ ...prevState, range: range }));
            }
            if (queryFilter.tags) {
                tags = queryFilter.tags.map((i: string) => i).filter((i: string) => i !== "");
                setLocalFilter((prevState: any) => ({ ...prevState, tags: tags }));
            }
            if (queryFilter.refs) {
                refs = queryFilter.refs.map((i: string) => i).filter((i: string) => i !== "");
                setLocalFilter((prevState: any) => ({ ...prevState, refs: refs }));
            }

            dispatch(
                transactionsActions.setFilter({
                    filter: {
                        ...filterData,
                        categoryIds: categoryIds,
                        accountIds: accountIds,
                        tags: tags,
                        refs: refs,
                        range: range,
                    },
                })
            );
        }
    }, [filter]);

    const isFilterActive: any =
        localFilter.categoryIds.find((i: number) => i > 0) ||
        localFilter.accountIds.find((i: number) => i > 0) ||
        localFilter.tags.find((i: string) => i !== "") ||
        localFilter.refs.find((i: string) => i !== "") ||
        localFilter.range && localFilter.range.length === 2;

    const categoryTree = useMemo(() => getCategoriesTree(categories, false) as CategoryDetails[],[categories]);

    const filterDetails: any = useMemo(() => {
        const filteredCategories = categories.filter((category: CategoryDetails) =>
            localFilter.categoryIds.find((i: number) => i === category.id)
        );
        const filteredAccounts = accounts.filter((account: AccountDetails) =>
            localFilter.accountIds.find((i: number) => i === account.id)
        );
        const range = localFilter.range.map((i: number) => moment.unix(i));

        const tags = localFilter.tags.map((tag: string) => `#${tag}`).join(" ");
        const refs = localFilter.refs.map((ref: string) => `@${ref}`).join(" ");
        const combinedTagsAndRefs = [tags, refs].filter(Boolean).join(" ");

        return {
            accounts: filteredAccounts.length === 0 ? [defaultAccount] : filteredAccounts,
            categories: filteredCategories.length === 0 ? [defaultCategory] : filteredCategories,
            tagsAndRefs: localFilter.tagsAndRefs || combinedTagsAndRefs,
            range: range
        };
    }, [categories, accounts, localFilter]);

    const setAccountsHandler = (item: any) => {
        setLocalFilter((prevState: any) => ({
            ...prevState,
            accountIds: item.selectedKeys
                .map((i: string) => +i)
                .filter((i: number) => i > 0),
        }));
    }

    const setCategoriesHandler = (item: any) => {
        setLocalFilter((prevState: any) => ({
            ...prevState,
            categoryIds: item.selectedKeys
                .map((i: string) => +i)
                .filter((i: number) => i > 0),
        }));
    };

    const setTagsAndRefsHandler = (item: any) => {
        const input = item.target.value;
        const tags: string[] = [];
        const refs: string[] = [];

        const tagRegex = /#(\S+)/g;
        const refRegex = /@(\S+)/g;

        let match;
        while ((match = tagRegex.exec(input)) !== null) {
            tags.push(match[1]);
        }
        while ((match = refRegex.exec(input)) !== null) {
            refs.push(match[1]);
        }

        setLocalFilter((prevState: any) => ({
            ...prevState,
            tags: tags,
            refs: refs,
            tagsAndRefs: input
        }));
    };

    const setRangeHandler = (dates: any) => {
        setLocalFilter((prevState: any) => ({
            ...prevState,
            range: [moment(dates[0], "YYYY-MM-DD").unix(), moment(dates[1], "YYYY-MM-DD").unix()]
        }));
    };

    const resetFilterHandler = () => {
        navigate(`${location.pathname}?filter=`, { replace: true });
    }

    const applyFilterHandler = () => {
        let filter: string = "filter=";

        if (localFilter.categoryIds.length > 0) {
            filter += `categoryIds:${localFilter.categoryIds.join(",")};`;
        }

        if (localFilter.accountIds.length > 0) {
            filter += `accountIds:${localFilter.accountIds.join(",")};`;
        }

        if (localFilter.range.length === 2) {
            filter += `start:${moment.unix(localFilter.range[0]).format("YYYY-MM-DD")};end:${moment.unix(localFilter.range[1]).format("YYYY-MM-DD")};`;
        }

        if (localFilter.tags.length > 0) {
            filter += `tags:${localFilter.tags.join(",")};`;
        }

        if (localFilter.refs.length > 0) {
            filter += `refs:${localFilter.refs.join(",")};`;
        }

        navigate(`${location.pathname}${filter === "filter=" ? "" : `?${filter}`}`, { replace: true });
    }

    const rangePresets = useMemo((): Record<string, [moment.Moment, moment.Moment]> => ({
        [t("transactions.last7Days")]: [moment().subtract(7, "day").startOf("day"), moment().endOf("day")],
        [t("transactions.last30Days")]: [moment().subtract(30, "day").startOf("day"), moment().endOf("day")],
        [t("transactions.lastMonth")]: [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
        [t("transactions.thisMonth")]: [moment().startOf("month"), moment().endOf("day")],
    }), [t]);

    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.account")}>
                        <Dropdown
                            id="filter_account"
                            selection={filterDetails.accounts}
                            onChange={setAccountsHandler}
                            items={props.accounts}
                            multiple={true}
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
                            multiple={true}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Tags &amp; Refs">
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
                <Col span={24}>
                    <Form.Item label={t("common.interval")}>
                        <RangePicker
                            id="filter_range"
                            bordered={false}
                            inputReadOnly={true}
                            value={filterDetails.range}
                            ranges={rangePresets}
                            onChange={setRangeHandler}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12} style={{ textAlign: "center" }}>
                    <Form.Item>
                        <Button disabled={!isFilterActive} onClick={resetFilterHandler} style={{ width: "150px" }}>
                            {t("transactions.resetFilter")}
                        </Button>
                    </Form.Item>
                </Col>
                <Col span={12} style={{ textAlign: "center" }}>
                    <Form.Item>
                        <Button type="primary" disabled={!isFilterActive} onClick={applyFilterHandler} style={{ width: "150px" }}>
                            {t("transactions.applyFilter")}
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionFilterForm;
