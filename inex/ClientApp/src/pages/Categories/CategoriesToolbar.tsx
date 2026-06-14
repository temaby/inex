import * as React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
    Input,
    ListPanelFilterBar,
    ListPanelHeader,
    SegmentedControl,
} from "../../components/primitives";

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
    const countSummary = t("categories.countSummary", {
        visible,
        total,
        scope: activeOnly
            ? t("categories.scope.activeOnly").toLowerCase()
            : t("categories.scope.all").toLowerCase(),
    });

    return (
        <React.Fragment>
            <ListPanelHeader
                title={t("categories.listTitle")}
                count={refreshing ? `${countSummary} · ${t("categories.loading.refreshing")}` : countSummary}
                actions={
                    <div className="r-category-toolbar">
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
                }
            />
            <ListPanelFilterBar>
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
                <Input
                    aria-label={t("categories.search.label")}
                    className="categories-search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={t("categories.search.placeholder")}
                    prefix={<Search size={15} aria-hidden="true" />}
                    variant="search"
                    width="var(--management-toolbar-search-width)"
                />
            </ListPanelFilterBar>
        </React.Fragment>
    );
};
