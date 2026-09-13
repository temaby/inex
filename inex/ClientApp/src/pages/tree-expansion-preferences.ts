import { useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";

type TreeName = "accounts" | "categories";

const STORAGE_PREFIX = "inex.tree-expansion";
const EMPTY_COLLAPSED_NODE_IDS = new Set<string>();

export const getTreeExpansionStorageKey = (tree: TreeName, userId: number): string =>
    `${STORAGE_PREFIX}.${tree}.user-${userId}`;

const readCollapsedNodeIds = (tree: TreeName, userId: number): Set<string> => {
    try {
        const stored = window.localStorage.getItem(getTreeExpansionStorageKey(tree, userId));
        if (stored == null) return new Set();

        const parsed: unknown = JSON.parse(stored);
        return Array.isArray(parsed)
            ? new Set(parsed.filter((id): id is string => typeof id === "string"))
            : new Set();
    } catch {
        return new Set();
    }
};

export const useCollapsedTreeNodeIds = (tree: TreeName, userId?: number): [Set<string>, Dispatch<SetStateAction<Set<string>>>] => {
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
        () => userId == null ? new Set() : readCollapsedNodeIds(tree, userId),
    );
    const [restoredUserId, setRestoredUserId] = useState<number | null>(userId ?? null);

    useLayoutEffect(() => {
        if (userId == null) {
            setCollapsedNodeIds(new Set());
            setRestoredUserId(null);
            return;
        }

        setCollapsedNodeIds(readCollapsedNodeIds(tree, userId));
        setRestoredUserId(userId);
    }, [tree, userId]);

    useEffect(() => {
        if (userId == null || restoredUserId !== userId) return;

        try {
            window.localStorage.setItem(
                getTreeExpansionStorageKey(tree, userId),
                JSON.stringify([...collapsedNodeIds]),
            );
        } catch {
            // Keep the tree state in memory when browser storage is unavailable.
        }
    }, [collapsedNodeIds, restoredUserId, tree, userId]);

    return [restoredUserId === (userId ?? null) ? collapsedNodeIds : EMPTY_COLLAPSED_NODE_IDS, setCollapsedNodeIds];
};
