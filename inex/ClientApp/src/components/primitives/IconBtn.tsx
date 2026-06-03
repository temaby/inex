import * as React from 'react';

export interface IconBtnProps {
    icon: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    active?: boolean;
    size?: number;
    title: string;
}

export const IconBtn: React.FC<IconBtnProps> = ({
    icon,
    onClick,
    active = false,
    size = 32,
    title,
}) => {
    const style: React.CSSProperties = {
        alignItems: "center",
        background: active ? "var(--brand-ink)" : "#fff",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-2)",
        color: active ? "#fff" : "var(--fg-2)",
        cursor: "pointer",
        display: "inline-flex",
        height: size,
        justifyContent: "center",
        padding: 0,
        transition: "background var(--dur-1) var(--ease-standard), color var(--dur-1) var(--ease-standard)",
        width: size,
    };

    return (
        <button aria-label={title} onClick={onClick} style={style} title={title} type="button">
            {icon}
        </button>
    );
};
