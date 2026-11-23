import * as React from "react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { buildUniqueDistributionColors } from "../../utils/distribution";
import {
    categoryPaletteColor,
    type CategorySpendStats,
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
    const { i18n, t } = useTranslation();
    const locale = i18n.resolvedLanguage ?? i18n.language;

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
    const shareFormatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
    const smallShareThreshold = 0.001;
    const formatShare = (share: number) => share > 0 && share < smallShareThreshold
        ? t("categories.hero.smallShare", { percent: shareFormatter.format(smallShareThreshold) })
        : shareFormatter.format(share);
    const distribution = stats.distribution.map((item) => ({
        ...item,
        label: item.key === "other" ? t("categories.hero.other") : item.label,
        shareLabel: formatShare(item.share),
    }));
    const distributionColorMap = (() => {
        const preferredColors: Record<string, string | undefined> = {};

        stats.distribution.forEach((item) => {
            const category = categoryById.get(Number(item.key));
            if (category) {
                preferredColors[item.key] = categoryPaletteColor(category, categories);
            }
        });

        return buildUniqueDistributionColors(
            stats.distribution.map((item) => item.key),
            preferredColors,
        );
    })();

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
                            fractionDigits="currency"
                            kind="expense"
                            locale={locale}
                            wrap
                        />
                    ) : (
                        <span className="categories-hero__dash">-</span>
                    )}
                </div>
                <div className="categories-hero__note" data-qa="hero-secondary-text">
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
                                    fractionDigits="currency"
                                    kind="expense"
                                    locale={locale}
                                    wrap
                                />
                                <small>
                                    {t("categories.hero.ofTotal", {
                                        percent: formatShare(stats.topParentSpend / stats.totalSpend),
                                    })}
                                </small>
                            </span>
                        </div>
                    ) : (
                        noSpendNote
                    )}
                </div>
            </div>
            <div className="categories-hero__details">
                {hasSpend ? (
                    <div className="categories-hero__distribution" aria-label={t("categories.hero.byCategory")} role="group">
                        <div className="categories-eyebrow" data-qa="hero-distribution-eyebrow">
                            {t("categories.hero.byCategory")}
                        </div>
                        <div className="categories-hero__distribution-bar" data-qa="hero-distribution-bar">
                            {distribution.map((item) => (
                                <span
                                    aria-label={`${item.label} ${item.shareLabel}`}
                                    className="categories-hero__distribution-segment"
                                    key={item.key}
                                    role="img"
                                    style={{
                                        background: distributionColorMap[item.key],
                                        width: `${Math.max(item.share * 100, 2)}%`,
                                    }}
                                />
                            ))}
                        </div>
                        <div className="categories-hero__legend" data-qa="hero-distribution-legend">
                            {distribution.map((item) => (
                                <div className="categories-hero__legend-item" key={item.key}>
                                    <span
                                        className="categories-hero__legend-swatch"
                                        style={{ background: distributionColorMap[item.key] }}
                                    />
                                    <strong className="categories-hero__legend-label">{item.label}</strong>
                                    <div className="categories-hero__legend-metrics">
                                        <small className="categories-hero__legend-amount">
                                            <Num
                                                value={item.value}
                                                currency={stats.currency}
                                                fractionDigits="currency"
                                                kind="expense"
                                                locale={locale}
                                                wrap
                                            />
                                        </small>
                                        <small className="categories-hero__legend-share">{item.shareLabel}</small>
                                    </div>
                                </div>
                            ))}
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
