import * as React from 'react';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLSelectElement>;
    children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, children, style, ...rest }) => {
    const [focused, setFocused] = React.useState(false);
    const selectStyle: React.CSSProperties = {
        appearance: "none",
        backgroundColor: "#fff",
        backgroundImage: "linear-gradient(45deg, transparent 50%, var(--fg-3) 50%), linear-gradient(135deg, var(--fg-3) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 16px) 50%, calc(100% - 11px) 50%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "5px 5px, 5px 5px",
        border: `1px solid ${focused ? "var(--income-500)" : "var(--border-2)"}`,
        borderRadius: "var(--radius-2)",
        boxShadow: focused ? "var(--focus-ring)" : undefined,
        color: "var(--fg-1)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        minWidth: 0,
        outline: "1px solid transparent",
        padding: "9px 32px 9px 11px",
        transition: "border-color var(--dur-1) var(--ease-standard), box-shadow var(--dur-1) var(--ease-standard)",
        ...style,
    };

    return (
        <select
            {...rest}
            onBlur={(event) => {
                setFocused(false);
                rest.onBlur?.(event);
            }}
            onChange={onChange}
            onFocus={(event) => {
                setFocused(true);
                rest.onFocus?.(event);
            }}
            style={selectStyle}
            value={value}
        >
            {children}
        </select>
    );
};
