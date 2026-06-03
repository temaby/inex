import * as React from 'react';

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
}) => {
    const [focused, setFocused] = React.useState(false);
    const wrapperStyle: React.CSSProperties = {
        alignItems: "stretch",
        background: disabled ? "var(--bg-muted)" : "#fff",
        border: `1px solid ${focused ? "var(--income-500)" : "var(--border-2)"}`,
        borderRadius: "var(--radius-2)",
        boxShadow: focused ? "var(--focus-ring)" : undefined,
        display: "flex",
        minWidth: 0,
        overflow: "hidden",
        transition: "border-color var(--dur-1) var(--ease-standard), box-shadow var(--dur-1) var(--ease-standard)",
    };

    const inputStyle: React.CSSProperties = {
        background: "transparent",
        border: 0,
        color: "var(--fg-1)",
        flex: 1,
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        minWidth: 0,
        outline: "1px solid transparent",
        padding: "9px 11px",
    };

    return (
        <span style={wrapperStyle}>
            {prefix && <span style={addonStyle}>{prefix}</span>}
            <input
                autoFocus={autoFocus}
                disabled={disabled}
                id={id}
                name={name}
                onBlur={() => setFocused(false)}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                style={inputStyle}
                type={type}
                value={value}
            />
            {suffix && <span style={addonStyle}>{suffix}</span>}
        </span>
    );
};
