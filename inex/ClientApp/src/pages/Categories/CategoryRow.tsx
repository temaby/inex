import * as React from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HIERARCHY_DEPTH_INCREMENT, HierarchyBranchToggle, Num } from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { type CategorySpendStat, isSystemCategory } from "./categories.utils";

interface CategoryRowProps {
    category: CategoryResponse;
    depth: number;
    hasChildren: boolean;
    isCollapsed: boolean;
    readOnly?: boolean;
    paletteColor: string;
    stats?: CategorySpendStat;
    statsAvailable: boolean;
    currency: string;
    onEdit: React.MouseEventHandler<HTMLButtonElement>;
    onBranchToggle: () => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
    category,
    depth,
    hasChildren,
    isCollapsed,
    readOnly = false,
    paletteColor,
    stats,
    statsAvailable,
    currency,
    onEdit,
    onBranchToggle,
}) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const operationsDescriptionId = React.useId();
    const locked = isSystemCategory(category);
    const count = stats?.transactionCount ?? 0;
    const hasActivity = statsAvailable && count > 0;
    const spend = stats?.totalSpend ?? 0;
    const lastOperationTimestamp = stats?.lastActiveDate;
    const lastOperationDate = hasActivity && lastOperationTimestamp ? new Date(lastOperationTimestamp) : null;
    const description = category.description?.trim() ?? "";
    const showDescription =
        description.length > 0 &&
        description.localeCompare(category.name.trim(), undefined, { sensitivity: "accent" }) !== 0;
    const noActivityLabel = statsAvailable
        ? t("categories.operations.noTransactions")
        : t("categories.operations.unavailable");
    const noSpendLabel = statsAvailable
        ? t("categories.operations.noSpend")
        : t("categories.operations.spendUnavailable");
    const countLabel = hasActivity ? t("transactions.kpi.transactionCount", { count }) : noActivityLabel;
    const lastOperationLabel = lastOperationDate && t("categories.operations.lastTransaction", {
        date: lastOperationDate.toLocaleDateString(locale, { dateStyle: "long" }),
    });
    const rowKindClass = hasChildren
        ? "category-row--parent"
        : depth > 0
            ? "category-row--child"
            : "category-row--leaf";
    const rowClassName = [
        "category-row",
        "r-category-row",
        "inex-hierarchy-row",
        hasChildren ? "inex-hierarchy-row--parent" : "inex-hierarchy-row--leaf",
        rowKindClass,
        !category.isEnabled ? "is-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const indent = Math.min(depth * HIERARCHY_DEPTH_INCREMENT, 42);
    const content = (
        <>
            <span className="category-row__name">
                {depth > 0 ? <span className="category-row__connector" /> : null}
                <span
                    className="category-row__swatch"
                    style={{
                        background: paletteColor,
                        height: depth > 0
                            ? "var(--inex-hierarchy-leaf-marker-size)"
                            : "var(--inex-hierarchy-marker-size)",
                        opacity: depth > 0 ? 0.65 : 1,
                        width: depth > 0
                            ? "var(--inex-hierarchy-leaf-marker-size)"
                            : "var(--inex-hierarchy-marker-size)",
                    }}
                />
                <span className="category-row__title">
                    <strong>{category.name}</strong>
                    {showDescription ? <small>{description}</small> : null}
                </span>
                {locked ? (
                    <Lock
                        aria-label={t("categories.systemLocked")}
                        size={13}
                        className="category-row__lock"
                    />
                ) : null}
                {!category.isEnabled ? (
                    <span className="category-row__chip">{t("categories.disabled")}</span>
                ) : null}
            </span>
            <span className="category-row__spent">
                {hasActivity && spend > 0 ? (
                    <strong>
                        <Num value={spend} currency={currency} kind="expense" />
                    </strong>
                ) : (
                    <strong
                        className="category-row__placeholder"
                        aria-label={noSpendLabel}
                        title={noSpendLabel}
                    >
                        —
                    </strong>
                )}
            </span>
            <span className="category-row__operations">
                {hasActivity ? (
                    <>
                        <strong>{countLabel}</strong>
                        {lastOperationDate && (
                            <time
                                dateTime={lastOperationTimestamp ?? undefined}
                                title={lastOperationLabel ?? undefined}
                            >
                                {lastOperationDate.toLocaleDateString(locale, {
                                    day: "numeric",
                                    month: "short",
                                    year: lastOperationDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                                })}
                            </time>
                        )}
                    </>
                ) : (
                    <strong
                        className="category-row__placeholder"
                        aria-label={noActivityLabel}
                        title={noActivityLabel}
                    >
                        —
                    </strong>
                )}
            </span>
        </>
    );

    return (
        <div
            className={rowClassName}
            style={{ "--category-indent": `${indent}px` } as React.CSSProperties}
        >
            {readOnly ? (
                <div className="category-row__edit category-row__edit--readonly">{content}</div>
            ) : (
                <button
                    aria-describedby={operationsDescriptionId}
                    aria-haspopup="dialog"
                    aria-label={t("categories.drawer.edit", { category: category.name })}
                    className="category-row__edit"
                    onClick={onEdit}
                    type="button"
                >
                    {content}
                    <span hidden id={operationsDescriptionId}>
                        {lastOperationLabel ? `${countLabel}. ${lastOperationLabel}` : countLabel}
                    </span>
                </button>
            )}
            {hasChildren ? (
                <HierarchyBranchToggle
                    ariaLabel={t(
                        isCollapsed ? "categories.branch.expand" : "categories.branch.collapse",
                        { category: category.name },
                    )}
                    className="category-row__branch-toggle"
                    isCollapsed={isCollapsed}
                    onToggle={onBranchToggle}
                />
            ) : null}
        </div>
    );
};

