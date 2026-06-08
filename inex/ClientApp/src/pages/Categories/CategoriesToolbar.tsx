import * as React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input, SegmentedControl } from "../../components/primitives";

export type CategoriesViewMode = "tree" | "spend";

interface CategoriesToolbarProps {
    total: number;
    visible: number;
    activeOnly: boolean;
    view: CategoriesViewMode;
    search: string;
    refreshing: boolean;
    onActiveOnlyChange: (activeOnly: boolean) => void;
    onViewChange: (view: CategoriesViewMode) => void;
    onSearchChange: (search: string) => void;
}

export const CategoriesToolbar: React.FC<CategoriesToolbarProps> = ({
    total,
    visible,
    activeOnly,
    view,
    search,
    refreshing,
    onActiveOnlyChange,
    onViewChange,
    onSearchChange,
}) => {
    const { t } = useTranslation();

    return (
        <section className="categories-toolbar">
            <div className="categories-toolbar__top r-category-toolbar">
                <div>
                    <h2>{t("categories.listTitle")}</h2>
                    <p>
                        {t("categories.countSummary", {
                            visible,
                            total,
                            scope: activeOnly
                                ? t("categories.scope.active").toLowerCase()
                                : t("categories.scope.all").toLowerCase(),
                        })}
                        {refreshing ? ` · ${t("categories.loading.refreshing")}` : ""}
                    </p>
                </div>
                <SegmentedControl
                    label={t("categories.controlLabels.status")}
                    size="compact"
                    options={[
                        { key: "active", label: t("categories.scope.active") },
                        { key: "all", label: t("categories.scope.all") },
                    ]}
                    value={activeOnly ? "active" : "all"}
                    onChange={(key) => onActiveOnlyChange(key === "active")}
                />
            </div>
            <div className="categories-toolbar__bottom r-category-filterbar">
                <SegmentedControl
                    label={t("categories.controlLabels.view")}
                    size="compact"
                    options={[
                        { key: "tree", label: t("categories.view.tree") },
                        { key: "spend", label: t("categories.view.bySpend") },
                    ]}
                    value={view}
                    onChange={(key) => onViewChange(key as CategoriesViewMode)}
                />
                <div className="categories-search">
                    <Input
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={t("categories.search.placeholder")}
                        prefix={<Search size={15} aria-hidden="true" />}
                        variant="search"
                    />
                </div>
            </div>
        </section>
    );
};

