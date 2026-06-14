import * as React from 'react';
import { useTranslation } from "react-i18next";

import { useSignage } from "./SignageContext";
import type { Signage } from "./SignageContext";

export type MoneyKind = "income" | "expense" | "transfer" | "neutral" | "warn";

export interface NumProps {
    value: number;
    currency?: string;
    kind?: MoneyKind;
    bare?: boolean;
    compact?: boolean;
    signage?: Signage;
    size?: string | number;
    currencySize?: "same" | "sm";
    dataQa?: string;
    valueDataQa?: string;
    currencyDataQa?: string;
    accessibleCurrency?: string;
}

const colorMap: Record<MoneyKind, string> = {
    income: "var(--income-600)",
    expense: "var(--expense-600)",
    transfer: "var(--transfer-fg)",
    neutral: "var(--fg-1)",
    warn: "var(--warn-fg)",
};

const inferKind = (value: number): MoneyKind => {
    if (value > 0) return "income";
    if (value < 0) return "expense";
    return "neutral";
};

const formatAmount = (value: number, compact: boolean): string => {
    const absoluteValue = Math.abs(value);

    if (compact && absoluteValue >= 1_000_000) {
        return `${(absoluteValue / 1_000_000).toFixed(1)}M`;
    }

    if (compact && absoluteValue >= 100_000) {
        return Math.round(absoluteValue).toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    return absoluteValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const getPrefix = (value: number, kind: MoneyKind, signage: ReturnType<typeof useSignage>["signage"]) => {
    if (value === 0) return "";

    if (signage === "signed") {
        return value > 0 ? "+" : "-";
    }

    if (signage === "arrows" && (kind === "transfer" || kind === "neutral")) {
        return value > 0 ? "\u2191 " : "\u2193 ";
    }

    if (signage === "color-only" && value < 0 && (kind === "transfer" || kind === "neutral")) {
        return "-";
    }

    return "";
};

export const Num: React.FC<NumProps> = ({
    value,
    currency,
    kind,
    bare = false,
    compact = false,
    signage,
    size,
    currencySize = "same",
    dataQa,
    valueDataQa,
    currencyDataQa,
    accessibleCurrency,
}) => {
    const { t } = useTranslation();
    const { signage: contextSignage } = useSignage();
    const resolvedKind = kind ?? inferKind(value);
    const resolvedSignage = signage ?? contextSignage;
    const formattedValue = `${getPrefix(value, resolvedKind, resolvedSignage)}${formatAmount(value, compact)}`;
    const visibleValue = bare || !currency ? formattedValue : `${formattedValue} ${currency}`;
    const accessibleValue = accessibleCurrency ? `${formattedValue} ${accessibleCurrency}` : visibleValue;
    const kindLabel = t(`primitives.kindLabel.${resolvedKind}`);

    const visibleStyle: React.CSSProperties = {
        color: colorMap[resolvedKind],
        display: "inline-flex",
        alignItems: "baseline",
        gap: 3,
        fontFamily: "var(--font-num)",
        fontFeatureSettings: "\"tnum\" 1",
        fontVariantNumeric: "tabular-nums",
        fontSize: size,
        whiteSpace: "nowrap",
    };

    const currencyStyle: React.CSSProperties = {
        fontSize: "0.72em",
        fontWeight: 600,
        lineHeight: 1,
        marginLeft: 1,
    };

    const shouldSplitCurrency = !bare && Boolean(currency) && (currencySize === "sm" || Boolean(currencyDataQa));

    return (
        <span aria-label={`${kindLabel}: ${accessibleValue}`} data-qa={dataQa} role="text">
            <span aria-hidden="true" data-qa={valueDataQa} style={visibleStyle}>
                {shouldSplitCurrency ? (
                    <>
                        <span>{formattedValue}</span>
                        <span data-qa={currencyDataQa} style={currencyStyle}>{currency}</span>
                    </>
                ) : visibleValue}
            </span>
        </span>
    );
};
