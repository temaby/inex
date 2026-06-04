import * as React from "react";
import {
    ChevronDown,
    ChevronUp,
    Lock,
    Settings2,
    Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CategoryResponse } from "../../store/categories/categories-api";
import { isSystemCategory } from "./categories.utils";

interface CategoryRowProps {
    category: CategoryResponse;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    paletteColor: string;
    onToggle: () => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
    category,
    depth,
    hasChildren,
    expanded,
    paletteColor,
    onToggle,
}) => {
    const { t } = useTranslation();
    const locked = isSystemCategory(category);
    const rowClassName = [
        "category-row",
        "r-category-row",
        depth === 0 ? "category-row--parent" : "category-row--child",
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
            <span className="category-row__name" style={{ paddingLeft: indent }}>
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
                    {category.description ? <small>{category.description}</small> : null}
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
                {depth === 0 && hasChildren ? (
                    <span className="category-row__chip category-row__chip--budget">
                        <Target size={11} aria-hidden="true" />
                        {t("categories.parent")}
                    </span>
                ) : null}
            </span>
            <span className="category-row__activity r-category-activity">
                <strong>-</strong>
                <small>{t("categories.activity.noTransactions")}</small>
            </span>
            <span className="category-row__spent">
                <strong>-</strong>
                <small>{t("categories.hero.usdEquiv")}</small>
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

