import * as React from "react";

export interface HierarchyBranchState {
    childrenId: string;
    id: string;
    isCollapsed: boolean;
    toggle: () => void;
}

export interface HierarchyListProps<TBranch> {
    branches: readonly TBranch[];
    className?: string;
    collapsedIds: ReadonlySet<string>;
    getBranchId: (branch: TBranch) => string;
    isCollapseDisabled?: (branch: TBranch) => boolean;
    onToggle: (id: string) => void;
    renderBranch: (branch: TBranch, state: HierarchyBranchState) => React.ReactNode;
    renderChildren: (branch: TBranch) => React.ReactNode;
}

/**
 * Generic disclosure shell for management-list hierarchies. Domain pages own
 * their data projection and rows while this control keeps branch identity and
 * the mounted visibility of descendants consistent.
 */
export const HierarchyList = <TBranch,>({
    branches,
    className,
    collapsedIds,
    getBranchId,
    isCollapseDisabled,
    onToggle,
    renderBranch,
    renderChildren,
}: HierarchyListProps<TBranch>) => (
    <div className={["inex-hierarchy-list", className].filter(Boolean).join(" ")}>
        {branches.map((branch) => {
            const id = getBranchId(branch);
            const childrenId = `hierarchy-children-${id}`;
            const isCollapsed = collapsedIds.has(id);
            const collapseDisabled = !isCollapsed && Boolean(isCollapseDisabled?.(branch));
            const state: HierarchyBranchState = {
                childrenId,
                id,
                isCollapsed,
                toggle: () => {
                    if (!collapseDisabled) onToggle(id);
                },
            };

            return (
                <div
                    className="inex-hierarchy-list__branch"
                    data-hierarchy-branch-id={id}
                    id={`hierarchy-branch-${id}`}
                    key={id}
                >
                    {renderBranch(branch, state)}
                    {!isCollapsed && (
                        <div
                            className="inex-hierarchy-list__children"
                            data-hierarchy-parent-id={id}
                            id={childrenId}
                        >
                            {renderChildren(branch)}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
);
