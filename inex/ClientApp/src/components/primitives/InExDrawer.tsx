import * as React from 'react';
import { Drawer } from "antd";
import { X } from "lucide-react";

export interface InExDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    width?: number;
    bodyPadding?: React.CSSProperties["padding"];
    children: React.ReactNode;
    footer?: React.ReactNode;
    footerAlign?: "start" | "end" | "between";
}

export const InExDrawer: React.FC<InExDrawerProps> = ({
    open,
    onClose,
    title,
    subtitle,
    width = 440,
    bodyPadding = 24,
    children,
    footer,
    footerAlign = "end",
}) => {
    const drawerWidth = `min(${width}px, 100vw)`;
    const footerJustifyContent: Record<NonNullable<InExDrawerProps["footerAlign"]>, React.CSSProperties["justifyContent"]> = {
        start: "flex-start",
        end: "flex-end",
        between: "space-between",
    };

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
            footer={footer}
            styles={{
                body: { padding: bodyPadding },
                footer: {
                    alignItems: "center",
                    borderTop: "1px solid var(--border-1)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: footerJustifyContent[footerAlign],
                    padding: "14px 24px",
                },
                header: { borderBottom: "1px solid var(--border-1)", padding: "20px 24px" },
            }}
            title={titleNode}
            width={drawerWidth}
        >
            {children}
        </Drawer>
    );
};
