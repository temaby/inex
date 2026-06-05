import * as React from 'react';
import { Drawer } from "antd";
import { X } from "lucide-react";

export interface InExDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    width?: number;
    children: React.ReactNode;
}

export const InExDrawer: React.FC<InExDrawerProps> = ({
    open,
    onClose,
    title,
    subtitle,
    width = 440,
    children,
}) => {
    const drawerWidth = `min(${width}px, 100vw)`;

    const titleNode = (
        <div>
            <div
                style={{
                    color: "var(--fg-1)",
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: 0,
                }}
            >
                {title}
            </div>
            {subtitle && (
                <div style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 2 }}>
                    {subtitle}
                </div>
            )}
        </div>
    );

    return (
        <Drawer
            closeIcon={<X color="var(--fg-3)" size={20} />}
            onClose={onClose}
            open={open}
            styles={{
                body: { padding: 24 },
                header: { borderBottom: "1px solid var(--border-1)", padding: "20px 24px" },
            }}
            title={titleNode}
            width={drawerWidth}
        >
            {children}
        </Drawer>
    );
};
