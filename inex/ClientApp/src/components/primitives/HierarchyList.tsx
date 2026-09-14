import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import "./HierarchyList.css";

export const HIERARCHY_DEPTH_INCREMENT = 28;

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

export interface HierarchyBranchToggleProps {
    ariaLabel: string;
    childrenId?: string;
    className?: string;
    disabled?: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
    title?: string;
}

/**
 * Shared disclosure control for continuous management-list hierarchies.
 * A collapsed branch always points right; an expanded branch always points down.
 */
export const HierarchyBranchToggle: React.FC<HierarchyBranchToggleProps> = ({
    ariaLabel,
    childrenId,
    className,
    disabled = false,
    isCollapsed,
    onToggle,
    title,
}) => (
    <button
        aria-controls={childrenId}
        aria-expanded={!isCollapsed}
        aria-label={ariaLabel}
        className={["inex-hierarchy-toggle", className].filter(Boolean).join(" ")}
        disabled={disabled}
        onClick={onToggle}
        title={title}
        type="button"
    >
        <span
            aria-hidden="true"
            className="inex-hierarchy-toggle__icon"
            data-hierarchy-disclosure={isCollapsed ? "collapsed" : "expanded"}
        >
            {isCollapsed ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
        </span>
    </button>
);

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
