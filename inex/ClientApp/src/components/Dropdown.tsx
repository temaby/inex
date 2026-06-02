import * as React from 'react';
import * as css from "./components/Dropdown.module.css";

import { Menu } from 'antd';
import type { MenuProps } from 'antd';

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

const Dropdown = (props: DropdownProps) => {
    const selectionIds = props.selection ? props.selection.map((item: DropdownItem) => item.id + "") : [];
    const selectionText = (props.selection && props.selection.length > 0)
        ? props.selection.map((item: DropdownItem) => item.name).join(', ')
        : (props.placeholder || "");

    const menuItems: MenuProps["items"] = [{
        key: props.id,
        label: selectionText,
        children: props.items.map((item: DropdownItem) =>
            !item.children
                ? { key: String(item.id), label: item.name }
                : {
                    key: String(item.id),
                    label: item.name,
                    children: item.children.map((sub: DropdownItem) => ({ key: String(sub.id), label: sub.name })),
                  }
        ),
    }];

    return (
      <Menu
        style={{ marginTop: "0px", marginBottom: "0px" }}
        onSelect={props.onChange}
        onDeselect={props.onChange}
        selectedKeys={selectionIds}
        triggerSubMenuAction="click"
        mode="vertical"
        multiple={props.multiple}
        items={menuItems}
      />
    );
};

export default Dropdown;
