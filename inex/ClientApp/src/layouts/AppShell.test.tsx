import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { InExButton } from "../components/primitives";
import authSlice from "../store/auth/auth-slice";
import AppShell from "./AppShell";

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string) => ({
            "nav.accounts": "Accounts",
            "nav.budgets": "Budgets",
            "nav.categories": "Categories",
            "nav.dashboard": "Dashboard",
            "nav.mainNav": "Main navigation",
            "nav.profile": "Profile",
            "nav.reports": "Reports",
            "nav.signOut": "Sign out",
            "nav.transactions": "Transactions",
        }[key] ?? key),
    }),
}));

const renderShell = () => {
    const store = configureStore({
        reducer: {
            auth: authSlice.reducer,
        },
        preloadedState: {
            auth: {
                accessToken: "token",
                expiresAt: Date.now() + 3_600_000,
                user: { id: 1, username: "qa", email: "qa@example.com", currencyId: 1, languageCode: "en" },
                isInitializing: false,
                error: null,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={["/dashboard"]}>
                <AppShell
                    extra={<InExButton kind="primary">Primary action</InExButton>}
                    subtitle="Overview"
                    title="Dashboard"
                >
                    <button type="button">Content control</button>
                </AppShell>
            </MemoryRouter>
        </Provider>,
    );
};

describe("AppShell keyboard navigation", () => {
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
});
