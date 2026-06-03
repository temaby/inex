import * as React from 'react';
import { SearchX, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { InExButton } from "./Button";

export interface EmptyStateProps {
    iconNode?: React.ReactNode;
    title: string;
    description: string;
    actions?: React.ReactNode;
    secondary?: React.ReactNode;
}

export interface FilterEmptyProps {
    title?: string;
    description?: string;
    onClear?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    iconNode,
    title,
    description,
    actions,
    secondary,
}) => {
    const titleId = React.useId();
    const containerStyle: React.CSSProperties = {
        background: "#fff",
        backgroundImage: "radial-gradient(var(--border-1) 1px, transparent 1px)",
        backgroundPosition: "0 0",
        backgroundSize: "14px 14px",
        border: "1px dashed var(--border-2)",
        borderRadius: 14,
        maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,1) 45%, rgba(0,0,0,0.9))",
        padding: "64px 32px",
        textAlign: "center",
    };

    const iconWrapStyle: React.CSSProperties = {
        alignItems: "center",
        background: "linear-gradient(135deg, var(--income-50) 0%, var(--bg-stripe) 100%)",
        border: "1px solid var(--income-100)",
        borderRadius: 16,
        color: "var(--income-600)",
        display: "inline-flex",
        height: 64,
        justifyContent: "center",
        marginBottom: 18,
        width: 64,
    };

    const titleStyle: React.CSSProperties = {
        color: "var(--fg-1)",
        fontFamily: "var(--font-sans)",
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: 0,
        margin: "0 0 8px",
    };

    const descriptionStyle: React.CSSProperties = {
        color: "var(--fg-3)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        lineHeight: 1.6,
        margin: "0 auto",
        maxWidth: 480,
    };

    const actionsStyle: React.CSSProperties = {
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
        marginTop: 22,
    };

    return (
        <section aria-labelledby={titleId} style={containerStyle}>
            {iconNode && <div style={iconWrapStyle}>{iconNode}</div>}
            <h2 id={titleId} style={titleStyle}>
                {title}
            </h2>
            <p style={descriptionStyle}>{description}</p>
            {actions && <div style={actionsStyle}>{actions}</div>}
            {secondary && <div style={{ marginTop: 16 }}>{secondary}</div>}
        </section>
    );
};

export const FilterEmpty: React.FC<FilterEmptyProps> = ({ title, description, onClear }) => {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t("primitives.filterEmpty.title");
    const resolvedDescription = description ?? t("primitives.filterEmpty.description");

    const containerStyle: React.CSSProperties = {
        alignItems: "center",
        background: "#fff",
        border: "1px dashed var(--border-2)",
        borderRadius: "var(--radius-4)",
        display: "grid",
        justifyItems: "center",
        padding: "48px 24px",
        textAlign: "center",
    };

    const iconStyle: React.CSSProperties = {
        alignItems: "center",
        background: "var(--bg-stripe)",
        borderRadius: "var(--radius-3)",
        color: "var(--fg-3)",
        display: "inline-flex",
        height: 40,
        justifyContent: "center",
        marginBottom: 12,
        width: 40,
    };

    return (
        <div style={containerStyle}>
            <div aria-hidden="true" style={iconStyle}>
                <SearchX size={20} />
            </div>
            <h3 style={{ color: "var(--fg-1)", fontSize: 18, fontWeight: 600, margin: 0 }}>
                {resolvedTitle}
            </h3>
            <p style={{ color: "var(--fg-3)", lineHeight: 1.5, margin: "6px 0 0", maxWidth: 420 }}>
                {resolvedDescription}
            </p>
            {onClear && (
                <div style={{ marginTop: 16 }}>
                    <InExButton icon={<X size={14} />} kind="ghost" onClick={onClear} size="sm">
                        {t("primitives.filterEmpty.clearFilters")}
                    </InExButton>
                </div>
            )}
        </div>
    );
};
