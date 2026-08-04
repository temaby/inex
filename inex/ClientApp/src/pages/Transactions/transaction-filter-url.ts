import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
    normalizeTransactionFilter,
    type TransactionFilter,
} from "../../store/transactions/transactions-slice";

const FILTER_PARAM = "filter";
const DATE_FORMAT = "YYYY-MM-DD";

dayjs.extend(customParseFormat);

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

const parseDate = (value: string) => {
    const parsedDate = dayjs(value, DATE_FORMAT, true);
    return parsedDate.isValid() ? parsedDate : null;
};

const parseStartDate = (value: string): number | null =>
    parseDate(value)?.startOf("day").unix() ?? null;

const parseEndDate = (value: string): number | null =>
    parseDate(value)?.endOf("day").unix() ?? null;

export const parseTransactionFilterParam = (filter: string | null): TransactionFilter | null => {
    const parsedFilter: TransactionFilter = {
        accountIds: [],
        categoryIds: [],
        tags: [],
        refs: [],
        range: [],
        type: "all",
        search: "",
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
            case "type": {
                const type = decodeFilterValue(values[0] || "").trim().toLowerCase();
                if (type === "income" || type === "expense" || type === "transfer") {
                    parsedFilter.type = type;
                }
                break;
            }
            case "search":
                parsedFilter.search = decodeFilterValue(values[0] || "").trim();
                break;
        }
    });

    if (startDate !== "" && endDate !== "") {
        const start = parseStartDate(startDate);
        const end = parseEndDate(endDate);

        if (start !== null && end !== null && start <= end) {
            parsedFilter.range = [start, end];
        }
    }

    const normalizedFilter = normalizeTransactionFilter(parsedFilter);
    const hasActiveFilter =
        normalizedFilter.accountIds.length > 0 ||
        normalizedFilter.categoryIds.length > 0 ||
        normalizedFilter.tags.length > 0 ||
        normalizedFilter.refs.length > 0 ||
        normalizedFilter.range.length === 2 ||
        normalizedFilter.type !== "all" ||
        normalizedFilter.search !== "";

    return hasActiveFilter ? normalizedFilter : null;
};

export const buildTransactionFilterSearch = (filter: TransactionFilter): string => {
    const normalizedFilter = normalizeTransactionFilter(filter);
    let filterValue = "";

    if (normalizedFilter.categoryIds.length > 0) {
        filterValue += `categoryIds:${normalizedFilter.categoryIds.join(",")};`;
    }

    if (normalizedFilter.accountIds.length > 0) {
        filterValue += `accountIds:${normalizedFilter.accountIds.join(",")};`;
    }

    if (normalizedFilter.range.length === 2) {
        filterValue += `start:${dayjs.unix(normalizedFilter.range[0]).format("YYYY-MM-DD")};end:${dayjs.unix(normalizedFilter.range[1]).format("YYYY-MM-DD")};`;
    }

    if (normalizedFilter.tags.length > 0) {
        filterValue += `tags:${normalizedFilter.tags.map(encodeFilterValue).join(",")};`;
    }

    if (normalizedFilter.refs.length > 0) {
        filterValue += `refs:${normalizedFilter.refs.map(encodeFilterValue).join(",")};`;
    }

    if (normalizedFilter.type !== "all") {
        filterValue += `type:${normalizedFilter.type};`;
    }

    if (normalizedFilter.search !== "") {
        filterValue += `search:${encodeFilterValue(normalizedFilter.search)};`;
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
