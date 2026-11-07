import * as React from "react";
import { Drawer } from "antd";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dropdown from "./Dropdown";

const items = [{ id: 1, name: "Cash" }, { id: 2, name: "Card" }];

beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: vi.fn(), removeListener: vi.fn(),
            addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
        })),
    });
});

describe("Dropdown", () => {
    it("searches nested categories and retains ancestor context and selection identity", async () => {
        const user = userEvent.setup(); const onChange = vi.fn();
        render(<Dropdown id="category" searchPlaceholder="Search categories" onChange={onChange} placeholder="Select category"
            items={[{ id: 10, name: "Household", children: [{ id: 11, name: "Groceries" }, { id: 12, name: "Utilities" }] }, { id: 20, name: "Travel" }]} />);
        await user.click(screen.getByRole("button", { name: "Select category" }));
        await user.type(await screen.findByRole("textbox", { name: "Search categories" }), "grocer");
        expect(screen.getByRole("menuitem", { name: "Household" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.queryByRole("menuitem", { name: "Travel" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Utilities" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("menuitem", { name: "Groceries" }));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key: "11", keyPath: ["11", "10", "category"] }));
    });
    it("selects an account and closes even when the same selected account is clicked again", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Dropdown id="account" items={items} selection={[items[0]]} placeholder="Select account" onChange={onChange} />);
        const trigger = screen.getByRole("button", { name: "Select account: Cash" });
        await user.click(trigger);
        await user.click(await screen.findByRole("menuitem", { name: "Card" }));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key: "2", keyPath: ["2", "account"] }));
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).toHaveFocus();
        await user.click(trigger);
        await user.click(await screen.findByRole("menuitem", { name: "Cash" }));
        expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("expands category children inline and preserves their selection key path", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Dropdown id="category" items={[{ id: 10, name: "Household", children: [{ id: 11, name: "Groceries" }] }]} placeholder="Select category" onChange={onChange} />);
        await user.click(screen.getByRole("button", { name: "Select category" }));
        const parent = await screen.findByRole("menuitem", { name: "Household" });
        await user.click(parent);
        expect(parent).toHaveAttribute("aria-expanded", "true");
        const child = await screen.findByRole("menuitem", { name: "Groceries" });
        expect(child.closest(".inex-picker-menu")).not.toBeNull();
        await user.click(child);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key: "11", keyPath: ["11", "10", "category"] }));
    });

    it("keeps multiple selection open and reports both selection and deselection", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = render(<Dropdown id="budget" items={items} selection={[items[0]]} placeholder="Select categories" multiple onChange={onChange} />);
        await user.click(screen.getByRole("button", { name: "Select categories: Cash" }));
        await user.click(await screen.findByRole("menuitem", { name: "Card" }));
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ key: "2", selectedKeys: ["1", "2"] }));
        rerender(<Dropdown id="budget" items={items} selection={items} placeholder="Select categories" multiple onChange={onChange} />);
        await user.click(screen.getByRole("menuitem", { name: "Cash" }));
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ key: "1", selectedKeys: ["2"] }));
        expect(screen.getByRole("button", { name: "Select categories: Cash, Card" })).toHaveAttribute("aria-expanded", "true");
    });

    it("opens from the keyboard, focuses an option, and consumes Escape before the drawer", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Drawer open getContainer={false} title="New transaction" onClose={onClose}><Dropdown id="account" items={items} placeholder="Select account" /></Drawer>);
        const trigger = await screen.findByRole("button", { name: "Select account" });
        trigger.focus();
        fireEvent.keyDown(trigger, { key: "ArrowDown", keyCode: 40 });
        const menu = await screen.findByRole("menu", { name: "Select account" });
        await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
        expect(menu.closest(".ant-drawer-content")).not.toBeNull();
        const option = within(menu).getByRole("menuitem", { name: "Cash" });
        await user.keyboard("{Escape}");
        expect(onClose).not.toHaveBeenCalled();
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).toHaveFocus();
        expect(option).not.toHaveFocus();
        fireEvent.keyDown(trigger, { key: "Escape", keyCode: 27 });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dismisses when another form control is clicked", async () => {
        const user = userEvent.setup();
        render(<><Dropdown id="account" items={items} placeholder="Select account" /><button type="button">Other field</button></>);
        const trigger = screen.getByRole("button", { name: "Select account" });
        await user.click(trigger);
        await screen.findByRole("menu", { name: "Select account" });
        await user.click(screen.getByRole("button", { name: "Other field" }));
        await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
        expect(screen.getByRole("button", { name: "Other field" })).toHaveFocus();
    });

    it("closes on Tab and Shift+Tab without restoring focus to the trigger", async () => {
        const user = userEvent.setup();
        render(<><button type="button">Before</button><Dropdown id="account" items={items} placeholder="Select account" /><button type="button">After</button></>);
        const trigger = screen.getByRole("button", { name: "Select account" });
        await user.click(trigger);
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Cash" })).toHaveFocus());
        await user.tab();
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).not.toHaveFocus();
        expect(document.querySelector('.inex-picker-menu')?.contains(document.activeElement)).toBe(false);
        await user.click(trigger);
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Cash" })).toHaveFocus());
        await user.tab({ shift: true });
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).not.toHaveFocus();
        expect(document.querySelector('.inex-picker-menu')?.contains(document.activeElement)).toBe(false);
    });
});

