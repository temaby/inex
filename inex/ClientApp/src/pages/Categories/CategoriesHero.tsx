import * as React from "react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import {
    categoryPaletteColor,
    type CategorySpendStats,
} from "./categories.utils";

interface CategoriesHeroProps {
    categories: CategoryResponse[];
    loading?: boolean;
    periodLabel: string;
    previousPeriodLabel: string;
    stats: CategorySpendStats;
}

export const CategoriesHero: React.FC<CategoriesHeroProps> = ({
    categories,
    loading = false,
    periodLabel,
    previousPeriodLabel,
    stats,
}) => {
    const { t } = useTranslation();

    if (loading) {
        return (
            <section className="categories-hero r-categories-hero" aria-label={t("categories.loading.initial")}>
                <div className="categories-hero__summary categories-hero__skeleton" />
                <div className="categories-hero__details">
                    <div className="categories-hero__distribution categories-hero__skeleton" />
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
    const topParentShare = stats.totalSpend > 0
        ? Math.round((stats.topParentSpend / stats.totalSpend) * 100)
        : 0;

    return (
        <section className="categories-hero r-categories-hero" data-qa="hero-card">
            <div className="categories-hero__summary">
                <div className="categories-eyebrow" data-qa="hero-primary-label">
                    {t("categories.hero.monthLabel", { period: periodLabel })}
                </div>
                <div className="categories-hero__amount" data-qa="hero-primary-value">
                    {hasSpend ? (
                        <Num
                            value={stats.totalSpend}
                            currency={stats.currency}
                            currencyDataQa="hero-primary-currency"
                            currencySize="sm"
                            kind="expense"
                        />
                    ) : (
                        <span className="categories-hero__dash">-</span>
                    )}
                </div>
                <div className="categories-hero__note" data-qa="hero-secondary-text">
                    <span className="categories-hero__comparison">
                        {t("categories.hero.changeFromPeriod", { period: previousPeriodLabel })}
                    </span>
                    {stats.topParent && hasSpend ? (
                        <div className="categories-hero__top-category">
                            <span>
                                {t("categories.hero.mostSpentIn")}{" "}
                                <strong>{stats.topParent.name}</strong>
                            </span>
                            <span className="categories-hero__top-category-metric">
                                <Num
                                    value={stats.topParentSpend}
                                    currency={stats.currency}
                                    currencySize="sm"
                                    kind="expense"
                                    size={13}
                                />
                                <small>{t("categories.hero.ofTotal", { percent: topParentShare })}</small>
                            </span>
                        </div>
                    ) : (
                        noSpendNote
                    )}
                </div>
            </div>
            <div className="categories-hero__details">
                {hasSpend ? (
                    <div className="categories-hero__distribution" aria-label={t("categories.hero.byCategory")}>
                        <div className="categories-hero__distribution-head">
                            <strong>{t("categories.hero.byCategory")}</strong>
                            <span>{t("categories.hero.baseEquivalent", { currency: stats.currency })}</span>
                        </div>
                        <div className="categories-hero__distribution-bar" data-qa="hero-distribution-bar">
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
                        <div className="categories-hero__legend" data-qa="hero-distribution-legend">
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
                                        <span className="categories-hero__legend-swatch" style={{ background: color }} />
                                        <span className="categories-hero__legend-copy">
                                            <strong>{label}</strong>
                                            <small>
                                                <Num
                                                    value={item.value}
                                                    currency={stats.currency}
                                                    kind="expense"
                                                    size={11}
                                                    currencySize="sm"
                                                />
                                            </small>
                                        </span>
                                        <small className="categories-hero__legend-share">
                                            {Math.round(item.share * 100)}%
                                        </small>
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
