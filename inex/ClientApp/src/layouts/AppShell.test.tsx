import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { InExButton } from "../components/primitives";
import authSlice from "../store/auth/auth-slice";
import linkedAccountSlice from "../store/linkedAccount/linked-account-slice";
import AppShell from "./AppShell";

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => ({
            "nav.accounts": "Accounts",
            "nav.budgets": "Budgets",
            "nav.categories": "Categories",
            "nav.dashboard": "Dashboard",
            "nav.mainNav": "Main navigation",
            "nav.profile": "Profile",
            "nav.reports": "Reports",
            "nav.signOut": "Sign out",
            "nav.transactions": "Transactions",
            "linkedAccount.myData": "My data",
            "linkedAccount.selectorLabel": "Financial workspace",
            "linkedAccount.linkedOption": `${String(options?.username)} · ${String(options?.currency)}`,
        }[key] ?? key),
    }),
}));

const renderShell = (withLinkedAccount = false, route = "/dashboard") => {
    const store = configureStore({
        reducer: {
            auth: authSlice.reducer,
            linkedAccount: linkedAccountSlice.reducer,
        },
        preloadedState: {
            auth: {
                accessToken: "token",
                expiresAt: Date.now() + 3_600_000,
                user: { id: 1, username: "qa", email: "qa@example.com", currencyId: 1, languageCode: "en" },
                isInitializing: false,
                error: null,
            },
            linkedAccount: {
                sessionUserId: 1,
                linkState: withLinkedAccount ? {
                    state: "master" as const,
                    masterAccount: null,
                    linkedAccounts: [{
                        id: 2,
                        username: "linked-user",
                        email: "linked@example.com",
                        baseCurrency: "PLN",
                    }],
                } : null,
                selectedLinkedUserId: null,
                loading: false,
                unavailable: false,
            },
        },
    });

    const rendered = render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>
                <AppShell
                    extra={<InExButton kind="primary">Primary action</InExButton>}
                    frame="analytics"
                    subtitle="Overview"
                    title="Dashboard"
                >
                    <button type="button">Content control</button>
                </AppShell>
            </MemoryRouter>
        </Provider>,
    );

    return { ...rendered, store };
};

describe("AppShell keyboard navigation", () => {
    it("applies the selected page frame to the header and content", () => {
        const { container } = renderShell();

        expect(container.querySelectorAll(".inex-page-frame--analytics")).toHaveLength(2);
    });

    it("tabs through shell navigation, profile, page controls, content controls, and bottom navigation", async () => {
        const user = userEvent.setup();
        renderShell();

        const topDashboard = screen.getAllByRole("button", { name: "Dashboard" })[0];
        const topTransactions = screen.getAllByRole("button", { name: "Transactions" })[0];
        const topReports = screen.getAllByRole("button", { name: "Reports" })[0];
        const profile = screen.getByRole("button", { name: "Profile" });
        const primaryAction = screen.getByRole("button", { name: "Primary action" });
        const contentControl = screen.getByRole("button", { name: "Content control" });
        const bottomDashboard = screen.getAllByRole("button", { name: "Dashboard" })[1];
        const bottomReports = screen.getAllByRole("button", { name: "Reports" })[1];

        await user.tab();
        expect(document.activeElement).toBe(topDashboard);

        await user.tab();
        expect(document.activeElement).toBe(topTransactions);

        await user.tab();
        await user.tab();
        await user.tab();
        await user.tab();
        expect(document.activeElement).toBe(topReports);

        await user.tab();
        expect(document.activeElement).toBe(profile);

        await user.tab();
        expect(document.activeElement).toBe(primaryAction);

        await user.tab();
        expect(document.activeElement).toBe(contentControl);

        await user.tab();
        expect(document.activeElement).toBe(bottomDashboard);

        await user.tab();
        await user.tab();
        await user.tab();
        await user.tab();
        await user.tab();
        expect(document.activeElement).toBe(bottomReports);
    });

    it("shows the workspace selector only to masters and switches context in memory", async () => {
        const user = userEvent.setup();
        const { store } = renderShell(true, "/accounts");

        const selector = screen.getByRole("combobox", { name: "Financial workspace" });
        await user.click(selector);
        await user.click(await screen.findByText("linked-user · PLN"));

        expect(store.getState().linkedAccount.selectedLinkedUserId).toBe(2);
    });

    it("hides the workspace selector on pages that do not consume linked context", () => {
        renderShell(true, "/profile");

        expect(screen.queryByRole("combobox", { name: "Financial workspace" })).toBeNull();
    });
});
