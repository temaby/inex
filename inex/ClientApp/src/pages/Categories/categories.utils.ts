import type { CategoryResponse } from "../../store/categories/categories-api";

export type CategoryNode = CategoryResponse & {
    children: CategoryNode[];
};

export interface FlattenedCategoryNode {
    category: CategoryNode;
    depth: number;
    hasChildren: boolean;
}

const PALETTE = [
    "#1D4ED8",
    "#0F766E",
    "#9333EA",
    "#DB2777",
    "#EA580C",
    "#65A30D",
    "#475569",
    "#7C3AED",
];

export const isSystemCategory = (category: CategoryResponse): boolean =>
    category.isSystem || Boolean(category.systemCode);

export const buildCategoriesTree = (items: CategoryResponse[]): CategoryNode[] => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const attached = new Set<number>();
    const attach = (item: CategoryResponse, trail: Set<number>): CategoryNode => {
        if (trail.has(item.id)) {
            return { ...item, children: [] };
        }

        const nextTrail = new Set(trail);
        nextTrail.add(item.id);
        attached.add(item.id);

        return {
            ...item,
            children: items
                .filter((child) => child.parentId === item.id && child.id !== item.id)
                .map((child) => attach(child, nextTrail)),
        };
    };

    const rootItems = items.filter(
        (item) => item.parentId == null || !byId.has(item.parentId) || item.parentId === item.id,
    );
    const roots = rootItems.map((item) => attach(item, new Set<number>()));

    items.forEach((item) => {
        if (!attached.has(item.id)) {
            roots.push(attach(item, new Set<number>()));
        }
    });

    const userRoots = roots.filter((root) => !isSystemCategory(root));
    const systemRoots = roots.filter((root) => isSystemCategory(root));

    return [...userRoots, ...systemRoots];
};

export const flattenCategoryTree = (
    nodes: CategoryNode[],
    depth = 0,
): FlattenedCategoryNode[] =>
    nodes.flatMap((node) => [
        {
            category: node,
            depth,
            hasChildren: node.children.length > 0,
        },
        ...flattenCategoryTree(node.children, depth + 1),
    ]);

export const includeAncestorCategories = (
    matched: CategoryResponse[],
    all: CategoryResponse[],
): CategoryResponse[] => {
    const byId = new Map(all.map((category) => [category.id, category]));
    const resultIds = new Set(matched.map((category) => category.id));

    matched.forEach((item) => {
        let current: CategoryResponse | undefined = item;
        while (current?.parentId != null) {
            current = byId.get(current.parentId);
            if (!current || resultIds.has(current.id)) {
                break;
            }
            resultIds.add(current.id);
        }
    });

    return all.filter((category) => resultIds.has(category.id));
};

export const categoryPaletteColor = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): string => {
    const rootId = findRootCategory(category, allItems).id;
    const roots = allItems.filter(
        (item) => item.parentId == null && !isSystemCategory(item),
    );
    const index = roots.findIndex((root) => root.id === rootId);
    return PALETTE[Math.max(0, index) % PALETTE.length];
};

export const findRootCategory = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): CategoryResponse => {
    const byId = new Map(allItems.map((item) => [item.id, item]));
    let current = category;

    while (current.parentId != null && byId.has(current.parentId)) {
        current = byId.get(current.parentId) ?? current;
    }

    return current;
};

export const hasChildCategories = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): boolean => allItems.some((item) => item.parentId === category.id);
