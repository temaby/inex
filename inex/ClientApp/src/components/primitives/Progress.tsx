import * as React from 'react';

export interface BudgetProgressProps {
    value: number;
    max: number;
    height?: number;
    showLabel?: boolean;
    overBudgetLabel: string;
}

const getFillColor = (ratio: number) => {
    if (ratio >= 1) return "var(--expense-500)";
    if (ratio >= 0.75) return "var(--warn-500)";
    return "var(--income-500)";
};

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
    value,
    max,
    height = 6,
    showLabel = false,
    overBudgetLabel,
}) => {
    const ratio = max > 0 ? value / max : 0;
    const percentage = Math.max(0, Math.min(100, ratio * 100));
    const roundedPercentage = Math.round(percentage);

    const trackStyle: React.CSSProperties = {
        alignItems: "center",
        display: "flex",
        gap: 8,
        width: "100%",
    };

    const barTrackStyle: React.CSSProperties = {
        background: "var(--bg-muted)",
        borderRadius: "var(--radius-pill)",
        flex: 1,
        height,
        overflow: "hidden",
    };

    const fillStyle: React.CSSProperties = {
        background: getFillColor(ratio),
        borderRadius: "var(--radius-pill)",
        height: "100%",
        transition: "width 200ms ease",
        width: `${percentage}%`,
    };

    const labelStyle: React.CSSProperties = {
        color: "var(--fg-3)",
        fontFamily: "var(--font-num)",
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
    };

    return (
        <div
            aria-label={ratio >= 1 ? overBudgetLabel : undefined}
            aria-valuemax={max}
            aria-valuemin={0}
            aria-valuenow={value}
            role="progressbar"
            style={trackStyle}
        >
            <div style={barTrackStyle}>
                <div style={fillStyle} />
            </div>
            {showLabel && <span style={labelStyle}>{roundedPercentage}%</span>}
        </div>
    );
};
