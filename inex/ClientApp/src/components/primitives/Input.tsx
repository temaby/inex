import * as React from 'react';
import { Search } from "lucide-react";

export interface InputProps {
    value?: string | number;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    suffix?: React.ReactNode;
    prefix?: React.ReactNode;
    type?: React.HTMLInputTypeAttribute;
    autoFocus?: boolean;
    disabled?: boolean;
    name?: string;
    id?: string;
    variant?: "default" | "search";
    size?: "default" | "compact";
    width?: React.CSSProperties["width"];
    className?: string;
    style?: React.CSSProperties;
    "aria-label"?: string;
}

const addonStyle: React.CSSProperties = {
    alignItems: "center",
    background: "var(--bg-muted)",
    color: "var(--fg-3)",
    display: "inline-flex",
    fontFamily: "var(--font-num)",
    fontSize: 13,
    padding: "0 10px",
    whiteSpace: "nowrap",
};

export const Input: React.FC<InputProps> = ({
    value,
    onChange,
    placeholder,
    suffix,
    prefix,
    type = "text",
    autoFocus,
    disabled = false,
    name,
    id,
    variant = "default",
    size = "default",
    width,
    className,
    style,
    "aria-label": ariaLabel,
}) => {
    const [focused, setFocused] = React.useState(false);
    const compact = size === "compact" || variant === "search";
    const resolvedWidth = width ?? (variant === "search" ? 220 : undefined);
    const resolvedPrefix = prefix ?? (variant === "search" ? <Search size={15} aria-hidden="true" /> : undefined);

    const wrapperStyle: React.CSSProperties = {
        alignItems: "stretch",
        background: disabled ? "var(--bg-muted)" : "#fff",
        border: `1px solid ${focused ? "var(--income-500)" : "var(--border-2)"}`,
        borderRadius: "var(--radius-2)",
        boxShadow: focused ? "var(--focus-ring)" : undefined,
        display: "flex",
        flex: variant === "search" ? "1 1 220px" : undefined,
        flexBasis: variant === "search" ? "220px" : undefined,
        maxWidth: "100%",
        minWidth: "0px",
        overflow: "hidden",
        transition: "border-color var(--dur-1) var(--ease-standard), box-shadow var(--dur-1) var(--ease-standard)",
        width: resolvedWidth,
        ...style,
    };

    const inputStyle: React.CSSProperties = {
        background: "transparent",
        border: 0,
        color: "var(--fg-1)",
        flex: 1,
        fontFamily: "var(--font-sans)",
        fontSize: compact ? 13 : 14,
        minWidth: 0,
        outline: "1px solid transparent",
        padding: compact ? "7px 9px" : "9px 11px",
    };

    return (
        <span className={className} style={wrapperStyle}>
            {resolvedPrefix && <span style={addonStyle}>{resolvedPrefix}</span>}
            <input
                aria-label={ariaLabel}
                autoFocus={autoFocus}
                disabled={disabled}
                id={id}
                name={name}
                onBlur={() => setFocused(false)}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                style={inputStyle}
                type={variant === "search" ? "search" : type}
                value={value}
            />
            {suffix && <span style={addonStyle}>{suffix}</span>}
        </span>
    );
};
