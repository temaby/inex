import type { CSSProperties, ReactNode } from "react";

interface SummaryMetric {
    key?: string;
    label: string;
    value: ReactNode;
    highlight?: boolean;
    tone?: string;
    amountWidth?: number;
}

export default function ReportSummaryMetrics({ metrics }: { metrics: SummaryMetric[] }) {
    return (
        <dl className="report-summary__metrics" style={{ "--metric-count": metrics.length } as CSSProperties}>
            {metrics.map(({ key, label, value, highlight, tone, amountWidth }) => (
                <div key={key ?? label} className={highlight ? "report-summary__highlight" : undefined}>
                    <dt>{label}</dt>
                    <dd
                        data-tone={tone}
                        style={amountWidth === undefined ? undefined : { "--amount-width": amountWidth } as CSSProperties}
                    >
                        {value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
