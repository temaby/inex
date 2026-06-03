import * as React from 'react';
import { useTranslation } from "react-i18next";

export type TagKind = "income" | "expense" | "transfer" | "warn" | "neutral" | "ink";
export type TransactionKind = "income" | "expense" | "transfer";

export interface TagProps {
    kind?: TagKind;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
}

export interface KindChipProps {
    kind: TransactionKind;
}

const tagStyles: Record<TagKind, React.CSSProperties> = {
    income: {
        background: "var(--income-bg)",
        color: "var(--income-fg)",
    },
    expense: {
        background: "var(--expense-bg)",
        color: "var(--expense-fg)",
    },
    transfer: {
        background: "var(--transfer-bg)",
        color: "var(--transfer-fg)",
    },
    warn: {
        background: "var(--warn-bg)",
        color: "var(--warn-fg)",
    },
    neutral: {
        background: "var(--bg-muted)",
        color: "var(--fg-2)",
    },
    ink: {
        background: "var(--brand-ink)",
        color: "#fff",
    },
};

const dotStyles: Record<TransactionKind, React.CSSProperties> = {
    income: { background: "var(--income-500)" },
    expense: { background: "var(--expense-500)" },
    transfer: { background: "var(--transfer-500)" },
};

const baseTagStyle: React.CSSProperties = {
    alignItems: "center",
    border: 0,
    borderRadius: "var(--radius-1)",
    display: "inline-flex",
    fontFamily: "var(--font-sans)",
    fontSize: 10.5,
    fontWeight: 600,
    gap: 6,
    letterSpacing: "0.04em",
    lineHeight: 1.4,
    padding: "2px 8px",
    textTransform: "uppercase",
};

export const Tag: React.FC<TagProps> = ({ kind = "neutral", onClick, children }) => {
    const style: React.CSSProperties = {
        ...baseTagStyle,
        ...tagStyles[kind],
        cursor: onClick ? "pointer" : undefined,
    };

    if (onClick) {
        return (
            <button onClick={onClick} style={style} type="button">
                {children}
            </button>
        );
    }

    return <span style={style}>{children}</span>;
};

export const KindChip: React.FC<KindChipProps> = ({ kind }) => {
    const { t } = useTranslation();
    const style: React.CSSProperties = {
        borderRadius: "var(--radius-pill)",
        display: "inline-block",
        height: 6,
        width: 6,
        ...dotStyles[kind],
    };

    return <span aria-label={t(`primitives.kindLabel.${kind}`)} role="img" style={style} />;
};
