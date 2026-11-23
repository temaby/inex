import * as React from "react";
import { Alert, ConfigProvider, type ThemeConfig } from "antd";
import { useTranslation } from "react-i18next";

import { InExButton } from "./Button";
import { InExDrawer, RECORD_EDITOR_DRAWER_WIDTH, type InExDrawerProps } from "./InExDrawer";
import "./form-drawer.css";

const formTheme: ThemeConfig = {
    components: {
        Button: { controlHeight: 44 },
        DatePicker: { controlHeight: 44 },
        Form: { itemMarginBottom: 20, verticalLabelPadding: "0 0 8px" },
        Input: { controlHeight: 44 },
        Select: { controlHeight: 44 },
    },
};

interface FormDrawerProps extends Pick<InExDrawerProps, "open" | "onClose" | "afterOpenChange" | "title" | "subtitle" | "children"> {
    busy?: boolean;
    deleteAction?: React.ReactNode;
    error?: string | null;
    submitAction?: React.ReactNode;
}

export const FormDrawer = ({ busy, children, deleteAction, error, submitAction, ...drawer }: FormDrawerProps) => {
    const { t } = useTranslation();
    const [content, setContent] = React.useState<HTMLDivElement | null>(null);
    const [scrollable, setScrollable] = React.useState(false);
    const [viewportStyle, setViewportStyle] = React.useState<React.CSSProperties>();
    const errorRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        const body = content?.parentElement;
        if (!drawer.open || !content || !body) return;

        // Flex layout positions the actions. Overflow only controls the separator.
        const updateSeparator = () => setScrollable(body.scrollHeight > body.clientHeight);
        updateSeparator();

        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(updateSeparator);
        observer.observe(body);
        observer.observe(content);
        return () => observer.disconnect();
    }, [content, drawer.open]);

    React.useEffect(() => {
        if (drawer.open && error) errorRef.current?.scrollIntoView?.({ block: "nearest" });
    }, [drawer.open, error]);

    React.useEffect(() => {
        const viewport = window.visualViewport;
        if (!drawer.open || !viewport) return;

        const syncViewport = () => {
            const keyboardResizesViewport = viewport.scale === 1 && viewport.height < window.innerHeight;
            setViewportStyle(keyboardResizesViewport ? {
                "--form-drawer-viewport-height": `${viewport.height}px`,
                "--form-drawer-viewport-offset": `${viewport.offsetTop}px`,
            } as React.CSSProperties : undefined);
        };

        syncViewport();
        viewport.addEventListener("resize", syncViewport);
        viewport.addEventListener("scroll", syncViewport);
        return () => {
            viewport.removeEventListener("resize", syncViewport);
            viewport.removeEventListener("scroll", syncViewport);
        };
    }, [drawer.open]);

    return (
        <ConfigProvider theme={formTheme}>
            <InExDrawer
                {...drawer}
                bodyPadding="24px 24px 14px"
                footer={(
                    <div className="form-drawer-footer">
                        {deleteAction}
                        <div className="form-drawer-primary-actions">
                            <InExButton disabled={busy} onClick={drawer.onClose}>{t("common.cancel")}</InExButton>
                            {submitAction}
                        </div>
                    </div>
                )}
                rootClassName="form-drawer"
                rootStyle={viewportStyle}
                showFooterSeparator={scrollable}
                width={RECORD_EDITOR_DRAWER_WIDTH}
            >
                <div className="form-drawer-content" ref={setContent}>
                    {error && <div className="form-drawer-error" ref={errorRef}><Alert message={error} showIcon type="error" /></div>}
                    {children}
                </div>
            </InExDrawer>
        </ConfigProvider>
    );
};
