import * as React from "react";
import { Alert } from "antd";
import { FolderTree, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
    EmptyState,
    FilterEmpty,
    InExButton,
    InExDrawer,
} from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import type { CategoryResponse } from "../store/categories/categories-api";
import { useGetCategoriesQuery } from "../store/categories/categories-api";
import CategoryCreateForm from "./Categories/CategoryCreateForm";
import { CategoryInlineEdit } from "./Categories/CategoryInlineEdit";
import { CategoryRow } from "./Categories/CategoryRow";
import { CategoriesHero } from "./Categories/CategoriesHero";
import {
    CategoriesToolbar,
    type CategoriesViewMode,
} from "./Categories/CategoriesToolbar";
import {
    buildCategoriesTree,
    categoryPaletteColor,
    flattenCategoryTree,
    hasChildCategories,
    includeAncestorCategories,
    isSystemCategory,
} from "./Categories/categories.utils";
import "./Categories/categories.css";

const Categories = () => {
    const { t } = useTranslation();
    const [addOpen, setAddOpen] = React.useState(false);
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [view, setView] = React.useState<CategoriesViewMode>("tree");
    const [expandedId, setExpandedId] = React.useState<number | null>(null);
    const [createError, setCreateError] = React.useState<string | null>(null);

    const {
        data: categories = [],
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useGetCategoriesQuery("ALL");

    React.useEffect(() => {
        if (expandedId != null && !categories.some((category) => category.id === expandedId)) {
            setExpandedId(null);
        }
    }, [categories, expandedId]);

    const filteredCategories = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        const scope = activeOnly
            ? categories.filter((category) => category.isEnabled)
            : categories;

        if (!query) {
            return scope;
        }

        const matched = scope.filter((category) =>
            category.name.toLowerCase().includes(query),
        );

        return includeAncestorCategories(matched, categories);
    }, [activeOnly, categories, search]);

    const treeRows = React.useMemo(
        () => flattenCategoryTree(buildCategoriesTree(filteredCategories)),
        [filteredCategories],
    );

    const bySpendRows = React.useMemo(() => {
        const childParentIds = new Set(
            categories
                .map((category) => category.parentId)
                .filter((parentId): parentId is number => parentId != null),
        );

        return filteredCategories
            .filter(
                (category) =>
                    !isSystemCategory(category) && !childParentIds.has(category.id),
            )
            .map((category, index) => ({ category, index, spend: 0 }))
            .sort((left, right) => right.spend - left.spend || left.index - right.index)
            .map(({ category }) => ({
                category: {
                    ...category,
                    children: [],
                },
                depth: 0,
                hasChildren: false,
            }));
    }, [categories, filteredCategories]);

    const rows = view === "tree" ? treeRows : bySpendRows;
    const showInitialLoading = isLoading && categories.length === 0;
    const showFullError = isError && categories.length === 0;
    const showPartialError = isError && categories.length > 0;
    const showFirstUseEmpty = !showInitialLoading && !showFullError && categories.length === 0;
    const showFilterEmpty =
        !showInitialLoading && categories.length > 0 && filteredCategories.length === 0;
    const showRowsEmpty =
        !showInitialLoading && categories.length > 0 && filteredCategories.length > 0 && rows.length === 0;

    const clearFilters = () => {
        setSearch("");
        setActiveOnly(false);
    };

    const renderRows = (items: typeof rows) =>
        items.map(({ category, depth, hasChildren }) => {
            const expanded = expandedId === category.id;
            return (
                <React.Fragment key={category.id}>
                    <CategoryRow
                        category={category}
                        depth={depth}
                        hasChildren={hasChildren || hasChildCategories(category, categories)}
                        expanded={expanded}
                        paletteColor={categoryPaletteColor(category, categories)}
                        onToggle={() => setExpandedId(expanded ? null : category.id)}
                    />
                    {expanded ? (
                        <CategoryInlineEdit
                            category={category}
                            allCategories={categories}
                            onClose={() => setExpandedId(null)}
                        />
                    ) : null}
                </React.Fragment>
            );
        });

    return (
        <React.Fragment>
            <InExDrawer
                title={t("categories.addDrawerTitle")}
                subtitle={t("categories.addDrawerSubtitle")}
                open={addOpen}
                onClose={() => {
                    setAddOpen(false);
                    setCreateError(null);
                }}
            >
                {createError ? (
                    <Alert
                        className="categories-alert"
                        type="error"
                        showIcon
                        message={createError}
                    />
                ) : null}
                <CategoryCreateForm
                    onCreated={() => {
                        setAddOpen(false);
                        setCreateError(null);
                    }}
                    onError={() => setCreateError(t("categories.formErrors.createFailed"))}
                />
            </InExDrawer>
            <BasicPage
                title={t("categories.title")}
                subtitle={t("categories.subtitle")}
            >
                <div className="categories-workspace">
                    <CategoriesHero categories={categories} loading={showInitialLoading} />
                    <CategoriesToolbar
                        total={categories.length}
                        visible={filteredCategories.length}
                        activeOnly={activeOnly}
                        view={view}
                        search={search}
                        refreshing={isFetching && categories.length > 0}
                        onActiveOnlyChange={setActiveOnly}
                        onViewChange={setView}
                        onSearchChange={setSearch}
                        onAdd={() => setAddOpen(true)}
                    />
                    {showPartialError ? (
                        <Alert
                            className="categories-alert"
                            type="warning"
                            showIcon
                            message={t("categories.error.partialFailure")}
                            action={
                                <InExButton kind="ghost" size="sm" onClick={() => refetch()}>
                                    {t("categories.error.retry")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {showFullError ? (
                        <EmptyState
                            iconNode={<FolderTree size={30} />}
                            title={t("categories.error.loadFailed")}
                            description={t("categories.error.loadFailedDescription")}
                            actions={
                                <InExButton kind="primary" onClick={() => refetch()}>
                                    {t("categories.error.retry")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {showFirstUseEmpty ? (
                        <EmptyState
                            iconNode={<FolderTree size={30} />}
                            title={t("categories.emptyState.title")}
                            description={t("categories.emptyState.description")}
                            actions={
                                <InExButton
                                    kind="primary"
                                    icon={<Plus size={16} aria-hidden="true" />}
                                    onClick={() => setAddOpen(true)}
                                >
                                    {t("categories.emptyState.addManually")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {!showFullError && !showFirstUseEmpty ? (
                        <section className="categories-list">
                            <div className="categories-list__header">
                                <span>{t("categories.category")}</span>
                                <span>{t("categories.activity.title")}</span>
                                <span>{t("categories.snapshot.spend")}</span>
                                <span />
                            </div>
                            {showInitialLoading ? (
                                <div
                                    className="categories-loading"
                                    aria-label={t("categories.loading.initial")}
                                >
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            ) : null}
                            {showFilterEmpty || showRowsEmpty ? (
                                <FilterEmpty
                                    title={t("categories.filterEmpty.title")}
                                    description={t("categories.filterEmpty.description")}
                                    onClear={clearFilters}
                                />
                            ) : null}
                            {!showInitialLoading && !showFilterEmpty && !showRowsEmpty ? renderRows(rows) : null}
                        </section>
                    ) : null}
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Categories;
