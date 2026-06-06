import dayjs from "dayjs";

import type { TransactionFilter } from "../../store/transactions/transactions-slice";

const FILTER_PARAM = "filter";

const encodeFilterValue = (value: string): string => encodeURIComponent(value);

const decodeFilterValue = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const parseNumberValues = (values: string[]): number[] =>
    values
        .map(value => +decodeFilterValue(value))
        .filter(value => value > 0);

const parseTextValues = (values: string[]): string[] =>
    values
        .map(decodeFilterValue)
        .filter(value => value !== "");

const parseStartDate = (value: string): number =>
    dayjs(value).startOf("day").unix();

const parseEndDate = (value: string): number =>
    dayjs(value).endOf("day").unix();

export const parseTransactionFilterParam = (filter: string | null): TransactionFilter | null => {
    const parsedFilter: TransactionFilter = {
        accountIds: [],
        categoryIds: [],
        tags: [],
        refs: [],
        range: [],
    };
    let startDate = "";
    let endDate = "";

    filter?.split(";").forEach((filterPart: string) => {
        const separatorIndex = filterPart.indexOf(":");
        if (separatorIndex < 0) return;

        const key = filterPart.slice(0, separatorIndex);
        const values = filterPart
            .slice(separatorIndex + 1)
            .split(",")
            .filter(value => value !== "");

        switch (key) {
            case "accountIds":
                parsedFilter.accountIds = parseNumberValues(values);
                break;
            case "categoryIds":
                parsedFilter.categoryIds = parseNumberValues(values);
                break;
            case "start":
                startDate = decodeFilterValue(values[0] || "");
                break;
            case "end":
                endDate = decodeFilterValue(values[0] || "");
                break;
            case "tags":
                parsedFilter.tags = parseTextValues(values);
                break;
            case "refs":
                parsedFilter.refs = parseTextValues(values);
                break;
        }
    });

    if (startDate !== "" && endDate !== "") {
        parsedFilter.range = [
            parseStartDate(startDate),
            parseEndDate(endDate),
        ];
    }

    const hasActiveFilter =
        parsedFilter.accountIds.length > 0 ||
        parsedFilter.categoryIds.length > 0 ||
        parsedFilter.tags.length > 0 ||
        parsedFilter.refs.length > 0 ||
        parsedFilter.range.length === 2;

    return hasActiveFilter ? parsedFilter : null;
};

export const buildTransactionFilterSearch = (filter: TransactionFilter): string => {
    let filterValue = "";

    if (filter.categoryIds.length > 0) {
        filterValue += `categoryIds:${filter.categoryIds.join(",")};`;
    }

    if (filter.accountIds.length > 0) {
        filterValue += `accountIds:${filter.accountIds.join(",")};`;
    }

    if (filter.range.length === 2) {
        filterValue += `start:${dayjs.unix(filter.range[0]).format("YYYY-MM-DD")};end:${dayjs.unix(filter.range[1]).format("YYYY-MM-DD")};`;
    }

    if (filter.tags.length > 0) {
        filterValue += `tags:${filter.tags.map(encodeFilterValue).join(",")};`;
    }

    if (filter.refs.length > 0) {
        filterValue += `refs:${filter.refs.map(encodeFilterValue).join(",")};`;
    }

    if (filterValue === "") return "";

    const params = new URLSearchParams();
    params.set(FILTER_PARAM, filterValue);
    return `?${params.toString()}`;
};

export const buildSingleTagOrRefFilterSearch = (key: "tags" | "refs", value: string): string => {
    const params = new URLSearchParams();
    params.set(FILTER_PARAM, `${key}:${encodeFilterValue(value)};`);
    return `?${params.toString()}`;
};
