import * as React from 'react';

export interface FieldProps {
    label: React.ReactNode;
    required?: boolean;
    hint?: React.ReactNode;
    children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, required = false, hint, children }) => {
    const wrapperStyle: React.CSSProperties = {
        display: "grid",
        gap: 6,
        marginBottom: 14,
    };

    const labelStyle: React.CSSProperties = {
        color: "var(--fg-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.3,
    };

    const hintStyle: React.CSSProperties = {
        color: "var(--fg-4)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        lineHeight: 1.4,
    };

    return (
        <label style={wrapperStyle}>
            <span style={labelStyle}>
                {label}
                {required && <span aria-hidden="true"> *</span>}
            </span>
            {children}
            {hint && <span style={hintStyle}>{hint}</span>}
        </label>
    );
};
