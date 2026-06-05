import * as React from "react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import {
    categoryPaletteColor,
    type CategorySpendStats,
    isSystemCategory,
} from "./categories.utils";

interface CategoriesHeroProps {
    categories: CategoryResponse[];
    loading?: boolean;
    periodLabel: string;
    stats: CategorySpendStats;
}

export const CategoriesHero: React.FC<CategoriesHeroProps> = ({
    categories,
    loading = false,
    periodLabel,
    stats,
}) => {
    const { t } = useTranslation();
    const activeUserCategories = categories.filter(
        (category) => category.isEnabled && !isSystemCategory(category),
    );
    const parentCategories = activeUserCategories.filter(
        (category) => category.parentId == null,
    );
    const childCount = activeUserCategories.length - parentCategories.length;

    if (loading) {
        return (
            <section className="categories-hero r-categories-hero" aria-label={t("categories.loading.initial")}>
                <div className="categories-hero__summary categories-hero__skeleton" />
                <div className="categories-hero__details">
                    <div className="categories-hero__metric-grid">
                        <div className="categories-hero__skeleton" />
                        <div className="categories-hero__skeleton" />
                        <div className="categories-hero__skeleton" />
                    </div>
                    <div className="categories-hero__empty">
                        {t("categories.loading.initial")}
                    </div>
                </div>
            </section>
        );
    }

    const hasSpend = stats.available && stats.totalSpend > 0;
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const noSpendNote = stats.available
        ? t("categories.hero.noSpend")
        : t("categories.hero.unavailable");
    const noSpendDescription = stats.available
        ? t("categories.hero.noSpendDescription")
        : t("categories.hero.unavailableDescription");

    return (
        <section className="categories-hero r-categories-hero">
            <div className="categories-hero__summary">
                <div className="categories-eyebrow">
                    {t("categories.hero.monthLabel", { period: periodLabel })}
                </div>
                <div className="categories-hero__amount">
                    {hasSpend ? (
                        <Num value={stats.totalSpend} currency={stats.currency} kind="expense" />
                    ) : (
                        <span className="categories-hero__dash">-</span>
                    )}
                </div>
                <div className="categories-hero__note">
                    {stats.topParent && hasSpend ? (
                        <React.Fragment>
                            {t("categories.hero.mostSpentIn")}{" "}
                            <strong>{stats.topParent.name}</strong>{" "}
                            <Num
                                value={stats.topParentSpend}
                                currency={stats.currency}
                                kind="expense"
                                size={13}
                            />
                        </React.Fragment>
                    ) : (
                        noSpendNote
                    )}
                </div>
            </div>
            <div className="categories-hero__details">
                <div className="categories-hero__metric-grid">
                    <div>
                        <span>{t("categories.metrics.active")}</span>
                        <strong>{activeUserCategories.length}</strong>
                    </div>
                    <div>
                        <span>{t("categories.metrics.parents")}</span>
                        <strong>{parentCategories.length}</strong>
                    </div>
                    <div>
                        <span>{t("categories.metrics.children")}</span>
                        <strong>{Math.max(0, childCount)}</strong>
                    </div>
                </div>
                {hasSpend ? (
                    <div className="categories-hero__distribution" aria-label={t("categories.hero.byCategory")}>
                        <div className="categories-hero__distribution-head">
                            <strong>{t("categories.hero.byCategory")}</strong>
                            <span>{t("categories.hero.baseEquivalent", { currency: stats.currency })}</span>
                        </div>
                        <div className="categories-hero__distribution-bar">
                            {stats.distribution.map((item) => {
                                const category = categoryById.get(Number(item.key));
                                const color = category
                                    ? categoryPaletteColor(category, categories)
                                    : "var(--border-2)";
                                const label = item.key === "other"
                                    ? t("categories.hero.other")
                                    : item.label;
                                return (
                                    <span
                                        aria-label={`${label} ${Math.round(item.share * 100)}%`}
                                        className="categories-hero__distribution-segment"
                                        key={item.key}
                                        style={{
                                            background: color,
                                            width: `${Math.max(item.share * 100, 2)}%`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <div className="categories-hero__legend">
                            {stats.distribution.map((item) => {
                                const category = categoryById.get(Number(item.key));
                                const color = category
                                    ? categoryPaletteColor(category, categories)
                                    : "var(--border-2)";
                                const label = item.key === "other"
                                    ? t("categories.hero.other")
                                    : item.label;

                                return (
                                    <div className="categories-hero__legend-item" key={item.key}>
                                        <span style={{ background: color }} />
                                        <strong>{label}</strong>
                                        <small>{Math.round(item.share * 100)}%</small>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="categories-hero__empty" aria-label={t("categories.hero.byCategory")}>
                        <strong>{noSpendNote}</strong>
                        <span>{noSpendDescription}</span>
                    </div>
                )}
            </div>
        </section>
    );
};
