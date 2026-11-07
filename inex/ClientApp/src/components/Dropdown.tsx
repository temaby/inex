import * as React from "react";
import { Input, Menu, Popover } from "antd";
import type { InputRef, MenuProps, MenuRef } from "antd";
import { ChevronDown } from "lucide-react";

import css from "./Dropdown.module.css";

interface DropdownItem {
    id: number | string;
    name: string;
    children?: DropdownItem[];
    currency?: string;
}

interface DropdownProps {
    id: string;
    items: DropdownItem[];
    selection?: DropdownItem[];
    placeholder?: string;
    multiple?: boolean;
    onChange?: NonNullable<MenuProps["onSelect"]>;
    searchPlaceholder?: string;
    showCurrency?: boolean;
}

const itemLabel = (item: DropdownItem, showCurrency?: boolean) =>
    showCurrency && item.currency ? `${item.name} · ${item.currency}` : item.name;

const toMenuItems = (items: DropdownItem[], showCurrency?: boolean): MenuProps["items"] => items.map((item) => ({
    key: String(item.id),
    label: itemLabel(item, showCurrency),
    ...(item.children?.length ? { children: toMenuItems(item.children, showCurrency) } : {}),
}));

const Dropdown = (props: DropdownProps) => {
    const [search, setSearch] = React.useState("");
    const searchRef = React.useRef<InputRef>(null);
    const matchingItems = React.useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const filter = (items: DropdownItem[]): DropdownItem[] => items.flatMap(item => {
            if (item.name.toLocaleLowerCase().includes(query)) return [item];
            const children = item.children ? filter(item.children) : [];
            return children.length ? [{ ...item, children }] : [];
        });
        return query ? filter(props.items) : props.items;
    }, [props.items, search]);
    const searchOpenKeys: string[] = [];
    const collectParents = (items: DropdownItem[]) => items.forEach(item => {
        if (item.children?.length) { searchOpenKeys.push(String(item.id)); collectParents(item.children); }
    });
    if (search.trim()) collectParents(matchingItems);
    const [open, setOpen] = React.useState(false);
    const [popupWidth, setPopupWidth] = React.useState(0);
    const [popupHeight, setPopupHeight] = React.useState(320);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<MenuRef>(null);
    const selectionIds = props.selection?.map((item) => String(item.id)) ?? [];
    const selectionText = props.selection?.length
        ? props.selection.map((item) => itemLabel(item, props.showCurrency)).join(", ")
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
        const focusTimer = window.setTimeout(() => {
            if (props.searchPlaceholder) searchRef.current?.focus();
            else menuRef.current?.focus();
        }, 0);
        window.addEventListener("scroll", measurePopup, true);
        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener("scroll", measurePopup, true);
        };
    }, [open, measurePopup, props.searchPlaceholder]);

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
                    <>
                    {props.searchPlaceholder && <Input
                        ref={searchRef}
                        aria-label={props.searchPlaceholder}
                        placeholder={props.searchPlaceholder}
                        value={search}
                        allowClear
                        onChange={event => setSearch(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === "ArrowDown") { event.preventDefault(); menuRef.current?.focus(); }
                        }}
                    />}
                    <Menu
                        aria-label={props.placeholder ?? selectionText}
                        className={`inex-picker-menu ${css.menu}`}
                        id={menuId}
                        inlineIndent={16}
                        items={toMenuItems(matchingItems, props.showCurrency)}
                        {...(search.trim() ? { openKeys: searchOpenKeys } : {})}
                        mode="inline"
                        multiple={props.multiple}
                        onClick={() => { if (!props.multiple) closeAndFocus(); }}
                        onDeselect={handleSelection}
                        onSelect={handleSelection}
                        ref={menuRef}
                        selectedKeys={selectionIds}
                    />
                    </>
                )}
                getPopupContainer={(trigger) => trigger.closest<HTMLElement>(".ant-drawer-content") ?? document.body}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) { measurePopup(); setSearch(""); }
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
