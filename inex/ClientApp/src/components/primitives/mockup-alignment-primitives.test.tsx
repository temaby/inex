import * as React from "react";
import { render, screen } from "@testing-library/react";

import {
    InExDrawer,
    Input,
    ListPanel,
    ListPanelColumnHeader,
    ListPanelFilterBar,
    ListPanelHeader,
    ListPanelNoMatchRow,
    Num,
    SegmentedControl,
} from ".";

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

interface MockDrawerProps {
    children: React.ReactNode;
    closeIcon?: React.ReactNode;
    footer?: React.ReactNode;
    open?: boolean;
    styles?: {
        footer?: React.CSSProperties;
    };
    title?: React.ReactNode;
    width?: string | number;
}

vi.mock("antd", async (importOriginal) => ({
    ...await importOriginal<typeof import("antd")>(),
    Drawer: ({ children, closeIcon, footer, open, styles, title, width }: MockDrawerProps) =>
        open ? (
            <aside aria-label="mock-drawer" data-width={String(width)}>
                <header>
                    {title}
                    {closeIcon}
                </header>
                <main>{children}</main>
                {footer && <footer role="contentinfo" style={styles?.footer}>{footer}</footer>}
            </aside>
        ) : null,
}));

describe("mockup-alignment primitive contracts", () => {
    it("renders labeled compact segmented controls without losing pressed semantics", () => {
        render(
            <SegmentedControl
                label="VIEW"
                size="compact"
                options={[
                    { key: "list", label: "List" },
                    { key: "cards", label: "Cards" },
                ]}
                value="list"
                onChange={() => undefined}
            />,
        );

        expect(screen.getByRole("group", { name: "VIEW" })).toBeInTheDocument();
        expect(screen.getByText("VIEW")).toBeVisible();
        expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute("aria-pressed", "false");
    });

    it("renders a compact search input with a 220px wrapping contract", () => {
        render(
            <Input
                aria-label="Search transactions"
                placeholder="Search transactions..."
                value=""
                variant="search"
                onChange={() => undefined}
            />,
        );

        const searchbox = screen.getByRole("searchbox", { name: "Search transactions" });
        const wrapper = searchbox.parentElement;

        expect(searchbox).toHaveAttribute("placeholder", "Search transactions...");
        expect(wrapper).toHaveStyle({ flexBasis: "220px", maxWidth: "100%", minWidth: "0px", width: "220px" });
    });

    it("can render smaller adjacent currency suffixes while preserving the default string shape", () => {
        const { rerender } = render(<Num value={1234.56} currency="PLN" kind="neutral" />);

        expect(screen.getByText("1,234.56 PLN")).toBeInTheDocument();

        rerender(<Num value={1234.56} currency="PLN" kind="neutral" currencySize="sm" />);

        expect(screen.getByText("1,234.56")).toBeInTheDocument();
        expect(screen.getByText("PLN")).toHaveStyle({ fontSize: "0.72em" });
    });

    it("composes continuous list panels with desktop headers and simple no-match rows", () => {
        render(
            <ListPanel ariaLabel="Transactions">
                <ListPanelHeader title="Transactions" count="3 of 12 visible" />
                <ListPanelFilterBar>
                    <SegmentedControl
                        label="Status"
                        size="compact"
                        options={[{ key: "active", label: "Active" }]}
                        value="active"
                        onChange={() => undefined}
                    />
                </ListPanelFilterBar>
                <ListPanelColumnHeader columns={["Date", "Category", "Amount"]} />
                <ListPanelNoMatchRow message="No transactions match these filters" />
            </ListPanel>,
        );

        expect(screen.getByRole("region", { name: "Transactions" })).toBeInTheDocument();
        expect(screen.getByText("3 of 12 visible")).toBeVisible();
        expect(screen.getByText("Date")).toBeVisible();
        expect(screen.queryByRole("row")).not.toBeInTheDocument();
        expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("No transactions match these filters");
    });

    it("renders zero as a valid list-panel count", () => {
        render(<ListPanelHeader title="Accounts" count={0} />);

        expect(screen.getByText("0").tagName).toBe("P");
    });

    it("passes footer action alignment through the shared drawer contract", () => {
        render(
            <InExDrawer
                open
                onClose={() => undefined}
                title="New budget"
                footer={<button type="button">Create</button>}
                footerAlign="end"
            >
                Form body
            </InExDrawer>,
        );

        expect(screen.getByRole("contentinfo")).toHaveStyle({ justifyContent: "flex-end" });
        expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    });
});
