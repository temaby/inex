import * as React from 'react';

export type ButtonKind = "primary" | "danger" | "default" | "ghost" | "soft" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface InExButtonProps {
    kind?: ButtonKind;
    size?: ButtonSize;
    icon?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    type?: "button" | "submit" | "reset";
}

const kindStyles: Record<ButtonKind, React.CSSProperties> = {
    primary: {
        background: "var(--income-500)",
        border: "1px solid var(--income-500)",
        color: "#fff",
    },
    danger: {
        background: "var(--expense-500)",
        border: "1px solid var(--expense-500)",
        color: "#fff",
    },
    default: {
        background: "#fff",
        border: "1px solid var(--border-2)",
        color: "var(--fg-1)",
    },
    ghost: {
        background: "transparent",
        border: "1px solid var(--border-2)",
        color: "var(--fg-2)",
    },
    soft: {
        background: "var(--bg-muted)",
        border: "1px solid transparent",
        color: "var(--fg-1)",
    },
    link: {
        background: "transparent",
        border: "1px solid transparent",
        color: "var(--income-600)",
    },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
        fontSize: 13,
        padding: "6px 12px",
    },
    md: {
        fontSize: 14,
        padding: "9px 16px",
    },
    lg: {
        fontSize: 15,
        padding: "11px 20px",
    },
};

export const InExButton: React.FC<InExButtonProps> = ({
    kind = "default",
    size = "md",
    icon,
    onClick,
    disabled = false,
    children,
    style,
    type = "button",
}) => {
    const buttonStyle: React.CSSProperties = {
        alignItems: "center",
        borderRadius: "var(--radius-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        gap: 8,
        justifyContent: "center",
        lineHeight: 1.2,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
        transition: "background var(--dur-1) var(--ease-standard), border-color var(--dur-1) var(--ease-standard), color var(--dur-1) var(--ease-standard)",
        ...kindStyles[kind],
        ...sizeStyles[size],
        ...style,
    };

    return (
        <button disabled={disabled} onClick={onClick} style={buttonStyle} type={type}>
            {icon}
            {children}
        </button>
    );
};
