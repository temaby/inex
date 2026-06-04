import * as React from "react";
import { useTranslation } from "react-i18next";

import { Num } from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { isSystemCategory } from "./categories.utils";

interface CategoriesHeroProps {
    categories: CategoryResponse[];
    loading?: boolean;
}

export const CategoriesHero: React.FC<CategoriesHeroProps> = ({ categories, loading = false }) => {
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

    return (
        <section className="categories-hero r-categories-hero">
            <div className="categories-hero__summary">
                <div className="categories-eyebrow">{t("categories.hero.monthLabel")}</div>
                <div className="categories-hero__amount">
                    <Num value={0} currency="USD" kind="neutral" />
                </div>
                <div className="categories-hero__note">
                    {t("categories.hero.noSpend")}
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
                <div className="categories-hero__empty" aria-label={t("categories.hero.byCategory")}>
                    <strong>{t("categories.hero.noSpend")}</strong>
                    <span>{t("categories.hero.noSpendDescription")}</span>
                </div>
            </div>
        </section>
    );
};
