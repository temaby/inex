import * as React from "react";
import dayjs from "dayjs";
import {
    ChevronDown,
    ChevronUp,
    Lock,
    Settings2,
    Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { type CategorySpendStat, isSystemCategory } from "./categories.utils";

interface CategoryRowProps {
    category: CategoryResponse;
    depth: number;
    hasChildren: boolean;
    isEditing: boolean;
    isCollapsed: boolean;
    isCollapseDisabled: boolean;
    paletteColor: string;
    periodLabel: string;
    stats?: CategorySpendStat;
    statsAvailable: boolean;
    budget?: BudgetDetails;
    currency: string;
    onEdit: () => void;
    onBranchToggle: () => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
    category,
    depth,
    hasChildren,
    isEditing,
    isCollapsed,
    isCollapseDisabled,
    paletteColor,
    periodLabel,
    stats,
    statsAvailable,
    budget,
    currency,
    onEdit,
    onBranchToggle,
}) => {
    const { t } = useTranslation();
    const locked = isSystemCategory(category);
    const hasActivity = statsAvailable && (stats?.transactionCount ?? 0) > 0;
    const spend = stats?.totalSpend ?? 0;
    const description = category.description?.trim() ?? "";
    const showDescription =
        description.length > 0 &&
        description.localeCompare(category.name.trim(), undefined, { sensitivity: "accent" }) !== 0;
    const noActivityLabel = statsAvailable
        ? t("categories.activity.noTransactions")
        : t("categories.activity.unavailable");
    const noSpendLabel = statsAvailable
        ? t("categories.activity.noSpend")
        : t("categories.activity.spendUnavailable");
    const rowKindClass = hasChildren
        ? "category-row--parent"
        : depth > 0
            ? "category-row--child"
            : "category-row--leaf";
    const rowClassName = [
        "category-row",
        "r-category-row",
        rowKindClass,
        isEditing ? "is-expanded" : "",
        !category.isEnabled ? "is-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const indent = Math.min(depth * 28, 42);

    return (
        <div
            className={rowClassName}
            style={{ "--category-indent": `${indent}px` } as React.CSSProperties}
        >
            <button
                aria-label={t("categories.inlineEdit.edit", { category: category.name })}
                className="category-row__edit"
                onClick={onEdit}
                type="button"
            >
            <span className="category-row__name">
                {depth > 0 ? <span className="category-row__connector" /> : null}
                <span
                    className="category-row__swatch"
                    style={{
                        background: paletteColor,
                        height: depth > 0 ? 9 : 12,
                        opacity: depth > 0 ? 0.65 : 1,
                        width: depth > 0 ? 9 : 12,
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
                {budget ? (
                    <span className="category-row__chip category-row__chip--budget">
                        <Target size={11} aria-hidden="true" />
                        {t("categories.budgeted")}
                    </span>
                ) : null}
            </span>
            <span className="category-row__spent">
                {hasActivity && spend > 0 ? (
                    <React.Fragment>
                        <strong>
                            <Num value={spend} currency={currency} kind="expense" />
                        </strong>
                        <small>{periodLabel}</small>
                    </React.Fragment>
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
            <span className="category-row__activity r-category-activity">
                {hasActivity ? (
                    <React.Fragment>
                        <strong>
                            {stats?.transactionCount}{" "}
                            {t(
                                (stats?.transactionCount ?? 0) === 1
                                    ? "categories.activity.txn"
                                    : "categories.activity.txns",
                            )}
                        </strong>
                        <small>
                            {t("categories.activity.lastActive", {
                                date: stats?.lastActiveDate
                                    ? dayjs(stats.lastActiveDate).format("D MMM")
                                    : "",
                            })}
                        </small>
                    </React.Fragment>
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
            <span className="category-row__icon" aria-hidden="true">
                <Settings2 size={16} />
            </span>
            </button>
            {hasChildren ? (
                <button
                    aria-expanded={!isCollapsed}
                    aria-label={t(
                        isCollapsed ? "categories.branch.expand" : "categories.branch.collapse",
                        { category: category.name },
                    )}
                    className="category-row__branch-toggle"
                    disabled={isCollapseDisabled}
                    onClick={onBranchToggle}
                    title={isCollapseDisabled ? t("categories.branch.finishEditing") : undefined}
                    type="button"
                >
                    {isCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                </button>
            ) : null}
        </div>
    );
};

