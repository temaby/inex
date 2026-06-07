import * as React from "react";

export interface ListPanelProps {
    ariaLabel: string;
    children: React.ReactNode;
    className?: string;
}

export interface ListPanelHeaderProps {
    title: React.ReactNode;
    count?: React.ReactNode;
    actions?: React.ReactNode;
}

export interface ListPanelFilterBarProps {
    children: React.ReactNode;
}

export interface ListPanelColumnHeaderProps {
    columns: React.ReactNode[];
}

export interface ListPanelNoMatchRowProps {
    message: React.ReactNode;
    action?: React.ReactNode;
}

export const ListPanel: React.FC<ListPanelProps> = ({ ariaLabel, children, className }) => (
    <section
        aria-label={ariaLabel}
        className={["inex-list-panel", className].filter(Boolean).join(" ")}
    >
        {children}
    </section>
);

export const ListPanelHeader: React.FC<ListPanelHeaderProps> = ({ title, count, actions }) => (
    <div className="inex-list-panel__header">
        <div className="inex-list-panel__title-block">
            <h2>{title}</h2>
            {count !== null && count !== undefined && <p>{count}</p>}
        </div>
        {actions && <div className="inex-list-panel__actions">{actions}</div>}
    </div>
);

export const ListPanelFilterBar: React.FC<ListPanelFilterBarProps> = ({ children }) => (
    <div className="inex-list-panel__filters">{children}</div>
);

export const ListPanelColumnHeader: React.FC<ListPanelColumnHeaderProps> = ({ columns }) => (
    <div className="inex-list-panel__columns">
        {columns.map((column, index) => (
            <span key={index}>
                {column}
            </span>
        ))}
    </div>
);

export const ListPanelNoMatchRow: React.FC<ListPanelNoMatchRowProps> = ({ message, action }) => (
    <div className="inex-list-panel__no-match" role="status">
        <span>{message}</span>
        {action}
    </div>
);
