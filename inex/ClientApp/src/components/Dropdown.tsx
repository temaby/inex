import * as React from "react";
import { Menu, Popover } from "antd";
import type { MenuProps, MenuRef } from "antd";
import { ChevronDown } from "lucide-react";

import css from "./Dropdown.module.css";

interface DropdownItem {
    id: number | string;
    name: string;
    children?: DropdownItem[];
}

interface DropdownProps {
    id: string;
    items: DropdownItem[];
    selection?: DropdownItem[];
    placeholder?: string;
    multiple?: boolean;
    onChange?: NonNullable<MenuProps["onSelect"]>;
}

const toMenuItems = (items: DropdownItem[]): MenuProps["items"] => items.map((item) => ({
    key: String(item.id),
    label: item.name,
    ...(item.children?.length ? { children: toMenuItems(item.children) } : {}),
}));

const Dropdown = (props: DropdownProps) => {
    const [open, setOpen] = React.useState(false);
    const [popupWidth, setPopupWidth] = React.useState(0);
    const [popupHeight, setPopupHeight] = React.useState(320);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<MenuRef>(null);
    const selectionIds = props.selection?.map((item) => String(item.id)) ?? [];
    const selectionText = props.selection?.length
        ? props.selection.map((item) => item.name).join(", ")
        : (props.placeholder ?? "");
    const menuId = `${props.id}-options`;

    const measurePopup = React.useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPopupWidth(rect.width);
        // Leave room for the overlay gap and viewport edge on its better-fitting side.
        setPopupHeight(Math.max(0, Math.min(320, Math.max(rect.top, window.innerHeight - rect.bottom) - 16)));
    }, []);

    React.useLayoutEffect(() => {
        measurePopup();
        const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measurePopup);
        if (triggerRef.current) observer?.observe(triggerRef.current);
        window.addEventListener("resize", measurePopup);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", measurePopup);
        };
    }, [measurePopup]);

    React.useEffect(() => {
        if (!open) return;
        const focusTimer = window.setTimeout(() => menuRef.current?.focus(), 0);
        window.addEventListener("scroll", measurePopup, true);
        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener("scroll", measurePopup, true);
        };
    }, [open, measurePopup]);

    const closeAndFocus = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };
    const handleSelection: NonNullable<MenuProps["onSelect"]> = (info) => {
        // Keep the original synthetic root in the callback's key path.
        props.onChange?.({ ...info, keyPath: [...info.keyPath, props.id] });
    };

    return (
        <div
            className={css.container}
            onKeyDownCapture={(event) => {
                if (open && event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closeAndFocus();
                } else if (open && event.key === "Tab") {
                    // Let the browser move focus naturally when leaving the menu.
                    setOpen(false);
                }
            }}
        >
            <Popover
                arrow={false}
                classNames={{ root: "inex-picker-popup", body: css.popupBody }}
                content={(
                    <Menu
                        aria-label={props.placeholder ?? selectionText}
                        className={`inex-picker-menu ${css.menu}`}
                        id={menuId}
                        inlineIndent={16}
                        items={toMenuItems(props.items)}
                        mode="inline"
                        multiple={props.multiple}
                        onClick={() => { if (!props.multiple) closeAndFocus(); }}
                        onDeselect={handleSelection}
                        onSelect={handleSelection}
                        ref={menuRef}
                        selectedKeys={selectionIds}
                    />
                )}
                getPopupContainer={(trigger) => trigger.closest<HTMLElement>(".ant-drawer-content") ?? document.body}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) measurePopup();
                    setOpen(nextOpen);
                }}
                open={open}
                placement="bottomLeft"
                styles={{
                    root: { width: popupWidth, maxWidth: "calc(100vw - 32px)" },
                    body: { maxHeight: popupHeight, overflowY: "auto", overflowX: "hidden" },
                }}
                trigger="click"
            >
                <button
                    aria-controls={open ? menuId : undefined}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    aria-label={props.placeholder && props.selection?.length ? `${props.placeholder}: ${selectionText}` : selectionText}
                    className={css.trigger}
                    data-picker-id={props.id}
                    id={props.id}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                            event.preventDefault();
                            measurePopup();
                            setOpen(true);
                        }
                    }}
                    ref={triggerRef}
                    type="button"
                >
                    <span>{selectionText}</span>
                    <ChevronDown aria-hidden="true" size={16} />
                </button>
            </Popover>
        </div>
    );
};

export default Dropdown;
