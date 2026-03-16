import * as React from 'react';
import * as css from "./components/Dropdown.module.css";

import { Menu } from 'antd';

const { SubMenu } = Menu;

const Dropdown = (props: any) => {
    const selectionIds = props.selection ? props.selection.map((item: any) => item.id + "") : [];
    const selectionText = (props.selection && props.selection.length > 0) 
        ? props.selection.map((item: any) => item.name).join(', ') 
        : (props.placeholder || "");

    return (
      <Menu
        style={{ marginTop: "0px", marginBottom:"0px" }}
        onSelect={props.onChange}
        onDeselect={props.onChange}
        selectedKeys={selectionIds}
        triggerSubMenuAction="click"
        mode="vertical"
        multiple={props.multiple}
      >
        <SubMenu key={props.id} title={selectionText}>
          {props.items.map((item: any) =>
            !item.children ? (
              <Menu.Item key={item.id}>
                {item.name}
              </Menu.Item>
            ) : (
              <SubMenu key={item.id} title={item.name}>
                {item.children.map((subitem: any) => (
                  <Menu.Item key={subitem.id}>
                    {subitem.name}
                  </Menu.Item>
                ))}
              </SubMenu>
            )
          )}
        </SubMenu>
      </Menu>
    );
};

export default Dropdown;