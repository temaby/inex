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
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => {
    const containerStyle: React.CSSProperties = {
        alignItems: "center",
        background: "var(--bg-muted)",
        borderRadius: 8,
        display: "inline-flex",
        gap: 2,
        padding: 3,
    };

    return (
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
                    fontSize: 13,
                    fontWeight: 500,
                    gap: 6,
                    padding: "7px 10px",
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
    );
};
