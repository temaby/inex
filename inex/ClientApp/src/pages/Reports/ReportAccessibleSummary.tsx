import * as React from "react";
import "./reports.css";

export interface SummaryRow {
    key?: React.Key;
    label: string;
    value: React.ReactNode;
    detail?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}

interface ReportAccessibleSummaryProps {
    title: string;
    caption?: string;
    labelHeader: string;
    valueHeader: string;
    rows: SummaryRow[];
}

const ReportAccessibleSummary = ({ title, caption, labelHeader, valueHeader, rows }: ReportAccessibleSummaryProps) => (
    <section className="report-accessible-summary" aria-label={title}>
        <div className="report-accessible-summary__head">
            <h3>{title}</h3>
            {caption && <p>{caption}</p>}
        </div>
        <div className="report-accessible-summary__table" role="table">
            <div className="report-accessible-summary__row report-accessible-summary__row--header" role="row">
                <span role="columnheader">{labelHeader}</span>
                <span role="columnheader">{valueHeader}</span>
            </div>
            {rows.map((row, index) => (
                <div className="report-accessible-summary__row" role="row" key={row.key ?? `${row.label}-${index}`}>
                    <span role="cell">
                        {row.label}
                        {row.detail && <small>{row.detail}</small>}
                        {row.onAction && row.actionLabel && (
                            <button type="button" className="reports-link-button" onClick={row.onAction}>
                                {row.actionLabel}
                            </button>
                        )}
                    </span>
                    <span role="cell">{row.value}</span>
                </div>
            ))}
        </div>
    </section>
);

export default ReportAccessibleSummary;
