import * as React from 'react';
import * as css from "./components/Dropdown.module.css";

import { Menu } from 'antd';

const Dropdown = (props: any) => {
    const selectionIds = props.selection ? props.selection.map((item: any) => item.id + "") : [];
    const selectionText = (props.selection && props.selection.length > 0)
        ? props.selection.map((item: any) => item.name).join(', ')
        : (props.placeholder || "");

    const menuItems = [{
        key: props.id,
        label: selectionText,
        children: props.items.map((item: any) =>
            !item.children
                ? { key: String(item.id), label: item.name }
                : {
                    key: String(item.id),
                    label: item.name,
                    children: item.children.map((sub: any) => ({ key: String(sub.id), label: sub.name })),
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