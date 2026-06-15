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
    expanded: boolean;
    paletteColor: string;
    periodLabel: string;
    stats?: CategorySpendStat;
    statsAvailable: boolean;
    budget?: BudgetDetails;
    currency: string;
    onToggle: () => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
    category,
    depth,
    hasChildren,
    expanded,
    paletteColor,
    periodLabel,
    stats,
    statsAvailable,
    budget,
    currency,
    onToggle,
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
        expanded ? "is-expanded" : "",
        !category.isEnabled ? "is-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const indent = Math.min(depth * 28, 42);

    return (
        <button
            aria-expanded={expanded}
            className={rowClassName}
            onClick={onToggle}
            type="button"
        >
            <span className="category-row__name" style={{ paddingLeft: `calc(16px + ${indent}px)` }}>
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
            <span className="category-row__icon" aria-hidden="true">
                {expanded ? (
                    <ChevronUp size={17} />
                ) : hasChildren ? (
                    <ChevronDown size={17} />
                ) : (
                    <Settings2 size={16} />
                )}
            </span>
        </button>
    );
};

