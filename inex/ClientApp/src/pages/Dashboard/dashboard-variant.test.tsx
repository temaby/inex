import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardVariantStorageKey, useDashboardVariant } from "./dashboard-variant";

const Choice = ({ userId, name = "choice" }: { userId?: number; name?: string }) => {
    const [variant, setVariant] = useDashboardVariant(userId);
    return <button onClick={() => setVariant(variant === "classic" ? "visual" : "classic")}>{name}:{variant}</button>;
};

describe("dashboard local preference", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it.each([null, "invalid", "true", '"visual"'])("defaults to classic for absent or corrupt value %s", (value) => {
        if (value) localStorage.setItem(getDashboardVariantStorageKey(1), value);
        render(<Choice userId={1} />);
        expect(screen.getByRole("button")).toHaveTextContent("classic");
    });

    it("updates both consumers immediately and persists across remounts", () => {
        const { unmount } = render(<><Choice userId={1} /><Choice userId={1} name="other" /></>);
        fireEvent.click(screen.getByRole("button", { name: "choice:classic" }));
        expect(screen.getByRole("button", { name: "other:visual" })).toBeInTheDocument();
        expect(localStorage.getItem(getDashboardVariantStorageKey(1))).toBe("visual");
        unmount();
        render(<Choice userId={1} />);
        fireEvent.click(screen.getByRole("button", { name: "choice:visual" }));
        expect(localStorage.getItem(getDashboardVariantStorageKey(1))).toBe("classic");
    });

    it("isolates signed-in users and ignores unauthenticated writes", () => {
        localStorage.setItem(getDashboardVariantStorageKey(1), "visual");
        const { rerender } = render(<Choice userId={1} />);
        expect(screen.getByRole("button")).toHaveTextContent("visual");
        rerender(<Choice userId={2} />);
        expect(screen.getByRole("button")).toHaveTextContent("classic");
        rerender(<Choice />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByRole("button")).toHaveTextContent("classic");
        expect(localStorage.length).toBe(1);
    });

    it("responds to another tab and storage clear", () => {
        render(<Choice userId={1} />);
        act(() => {
            localStorage.setItem(getDashboardVariantStorageKey(1), "visual");
            window.dispatchEvent(new StorageEvent("storage", { key: getDashboardVariantStorageKey(1) }));
        });
        expect(screen.getByRole("button")).toHaveTextContent("visual");
        act(() => {
            localStorage.clear();
            window.dispatchEvent(new StorageEvent("storage", { key: null }));
        });
        expect(screen.getByRole("button")).toHaveTextContent("classic");
    });

    it("survives denied reads and writes, keeping an in-memory session choice", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
        const { unmount } = render(<Choice userId={99} />);
        expect(screen.getByRole("button")).toHaveTextContent("classic");
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByRole("button")).toHaveTextContent("visual");
        unmount();
        render(<Choice userId={99} />);
        expect(screen.getByRole("button")).toHaveTextContent("visual");
    });
});
