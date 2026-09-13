import { render, screen } from "@testing-library/react";

import { getTreeExpansionStorageKey, useCollapsedTreeNodeIds } from "./tree-expansion-preferences";

const TreeState = ({ userId }: { userId?: number }) => {
    const [collapsedNodeIds] = useCollapsedTreeNodeIds("accounts", userId);
    return <output>{[...collapsedNodeIds].sort().join(",")}</output>;
};

describe("tree expansion preferences", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("keeps saved state isolated when the authenticated user changes", () => {
        window.localStorage.setItem(getTreeExpansionStorageKey("accounts", 1), JSON.stringify(["USD"]));
        window.localStorage.setItem(getTreeExpansionStorageKey("accounts", 2), JSON.stringify(["PLN"]));

        const { rerender } = render(<TreeState userId={1} />);
        expect(screen.getByRole("status")).toHaveTextContent("USD");

        rerender(<TreeState userId={2} />);
        expect(screen.getByRole("status")).toHaveTextContent("PLN");
    });
});
