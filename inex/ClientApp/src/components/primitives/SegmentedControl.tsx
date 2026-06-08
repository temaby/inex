import * as React from 'react';

export interface SegmentedOption {
    key: string;
    label: string;
    icon?: React.ReactNode;
}

export interface SegmentedControlProps {
    options: SegmentedOption[];
    value: string;
    onChange: (key: string) => void;
    label?: React.ReactNode;
    size?: "default" | "compact";
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
    options,
    value,
    onChange,
    label,
    size = "default",
}) => {
    const labelId = React.useId();
    const compact = size === "compact";
    const wrapperStyle: React.CSSProperties = {
        alignItems: "center",
        display: "inline-flex",
        flex: "0 1 auto",
        flexWrap: "wrap",
        gap: 8,
        minWidth: 0,
    };

    const labelStyle: React.CSSProperties = {
        color: "var(--fg-3)",
        flex: "0 0 auto",
        fontFamily: "var(--font-sans)",
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1,
        whiteSpace: "nowrap",
    };

    const containerStyle: React.CSSProperties = {
        alignItems: "center",
        background: "var(--bg-muted)",
        borderRadius: 8,
        display: "inline-flex",
        gap: 2,
        minWidth: 0,
        padding: 3,
    };

    return (
        <div aria-labelledby={label ? labelId : undefined} role="group" style={wrapperStyle}>
            {label && (
                <span id={labelId} style={labelStyle}>
                    {label}
                </span>
            )}
            <div style={containerStyle}>
                {options.map((option) => {
                    const active = option.key === value;
                    const buttonStyle: React.CSSProperties = {
                        alignItems: "center",
                        background: active ? "#fff" : "transparent",
                        border: 0,
                        borderRadius: 6,
                        boxShadow: active ? "var(--shadow-1)" : "none",
                        color: active ? "var(--brand-ink)" : "var(--fg-3)",
                        cursor: "pointer",
                        display: "inline-flex",
                        fontFamily: "var(--font-sans)",
                        fontSize: compact ? 12 : 13,
                        fontWeight: 500,
                        gap: 6,
                        minHeight: compact ? 28 : 32,
                        padding: compact ? "5px 8px" : "7px 10px",
                        transition: "all 120ms ease",
                        whiteSpace: "nowrap",
                    };

                    return (
                        <button
                            aria-pressed={active}
                            key={option.key}
                            onClick={() => onChange(option.key)}
                            style={buttonStyle}
                            type="button"
                        >
                            {option.icon}
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
