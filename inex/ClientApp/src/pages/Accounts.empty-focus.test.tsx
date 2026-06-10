import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import ratesSlice from "../store/rates/rates-slice";
import { accountsApi } from "../store/accounts/accounts-api";
import Accounts from "./Accounts";
import {
    accountsVisualFixtureAccounts,
    accountsVisualFixtureCurrencies,
    accountsVisualFixtureMeta,
    accountsVisualFixtureRates,
    accountsVisualFixtureSummaries,
} from "../test/fixtures/accountsVisualFixture";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));

vi.mock("../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => {
            const translations: Record<string, string> = {
                "accounts.workspaceTitle": "Accounts",
                "accounts.searchPlaceholder": "Search accounts...",
                "accounts.toolbar.label": "Accounts inventory controls",
                "accounts.toolbar.statusLabel": "STATUS",
                "accounts.toolbar.viewLabel": "VIEW",
                "accounts.headers.account": "ACCOUNT",
                "accounts.headers.currency": "CURRENCY",
                "accounts.headers.share": "SHARE",
                "accounts.headers.balance": "BALANCE",
                "accounts.inventory.summary": `${String(options?.visible)} / ${String(options?.total)}`,
                "accounts.group.accountCountOne": `${String(options?.count)} account`,
                "accounts.group.accountCountOther": `${String(options?.count)} accounts`,
                "accounts.hero.momDeltaPercent": `${String(options?.value)} MoM`,
                "accounts.hero.momComparisonPeriod": "vs previous month",
                "accounts.hero.momComparisonFallback": "Change from previous month",
                "accounts.hero.baseEquivalentLabel": `${String(options?.currency)} equivalent`,
            };

            return translations[key] ?? key;
        },
    }),
}));

vi.mock("./Accounts/AccountCreateForm", () => ({
    default: ({ onCreated }: { onCreated: () => void }) => (
        <button onClick={onCreated} type="button">mock-create-account</button>
    ),
}));

vi.mock("./Accounts/AccountEditForm", () => ({
    default: () => <div>mock-account-edit</div>,
}));

const makeStore = (rates = [] as typeof accountsVisualFixtureRates) =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            rates: ratesSlice.reducer,
            [accountsApi.reducerPath]: accountsApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(accountsApi.middleware),
        preloadedState: {
            auth: {
                accessToken: "token",
                expiresAt: Date.now() + 3_600_000,
                user: { id: 1, username: "qa", email: "qa@example.com", currencyId: 1, languageCode: "en" },
                isInitializing: false,
                error: null,
            },
            rates: {
                items: rates,
                error: null,
            },
        },
    });

const populatedAccounts = [
    {
        id: 1,
        key: "cash",
        name: "Cash wallet",
        description: "cash WALLET",
        isEnabled: true,
        currencyId: 1,
        currency: "USD",
    },
    {
        id: 2,
        key: "card",
        name: "Card",
        description: "Daily card",
        isEnabled: true,
        currencyId: 1,
        currency: "USD",
    },
    {
        id: 3,
        key: "archive",
        name: "Archive",
        description: "Closed",
        isEnabled: false,
        currencyId: 1,
        currency: "USD",
    },
];

const populatedSummaries = [
    { ...populatedAccounts[0], value: 100, thisMonthNet: 10 },
    { ...populatedAccounts[1], value: 50, thisMonthNet: 5 },
    { ...populatedAccounts[2], value: 25, thisMonthNet: 2 },
];

describe("Accounts empty-state create focus", () => {
    beforeEach(() => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: [] } };
            }
            if (url === "/accounts/details?mode=active&ids[0]=1") {
                return { data: { data: [] } };
            }
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: [{ id: 1, key: "PLN" }] });
    });

    it("returns focus to the mounted header Add account button after first create", async () => {
        const user = userEvent.setup();
        const store = makeStore();

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        const emptyRegion = await screen.findByRole("region", { name: "accounts.emptyState.title" });
        await user.click(within(emptyRegion).getByRole("button", { name: "accounts.emptyState.primaryAction" }));
        await user.click(await screen.findByRole("button", { name: "mock-create-account" }));

        act(() => {
            store.dispatch(accountsApi.util.upsertQueryData("getAccounts", "ALL", [{
                id: 1,
                key: "cash",
                name: "Cash wallet",
                description: "Created in test",
                isEnabled: true,
                currencyId: 1,
                currency: "PLN",
            }]));
        });

        await waitFor(() => {
            expect(document.activeElement).toHaveTextContent("accounts.addAccount");
        });
        expect(screen.getByText("Cash wallet")).toBeInTheDocument();
    });

    it("renders audit toolbar labels, desktop headers, and active-scope counts", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: populatedAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=active")) {
                return { data: { data: populatedSummaries } };
            }
            return { data: null };
        });
        const store = makeStore();

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByRole("heading", { name: "Accounts" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Accounts inventory controls" })).toBeInTheDocument();
        const statusControl = screen.getByRole("group", { name: "STATUS" });
        const viewControl = screen.getByRole("group", { name: "VIEW" });
        expect(statusControl).toBeInTheDocument();
        expect(viewControl).toBeInTheDocument();
        expect(statusControl.closest(".accounts-toolbar__primary")).not.toBeNull();
        expect(viewControl.closest(".accounts-toolbar__filters")).not.toBeNull();
        const searchbox = screen.getByRole("searchbox", { name: "accounts.searchLabel" });
        expect(searchbox.closest(".accounts-toolbar__filters")).not.toBeNull();
        expect(searchbox).toHaveAttribute("placeholder", "Search accounts...");

        expect(screen.getByText("ACCOUNT")).toBeVisible();
        expect(screen.getByText("CURRENCY")).toBeVisible();
        expect(screen.getByText("SHARE")).toBeVisible();
        expect(screen.getByText("BALANCE")).toBeVisible();
        expect(screen.getByText("2 / 2")).toBeVisible();
        expect(screen.queryByText("2 / 3")).not.toBeInTheDocument();
        expect(screen.queryByText("cash WALLET")).not.toBeInTheDocument();
        expect(screen.getByText("Daily card")).toBeVisible();
        expect(document.querySelector(".accounts-share-bar")).not.toBeInTheDocument();
    });

    it("renders fixture currency groups expanded by default and supports collapsed-state QA", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: accountsVisualFixtureAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=active")) {
                return { data: { data: accountsVisualFixtureSummaries } };
            }
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        const store = makeStore(accountsVisualFixtureRates);

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByText("UZS main wallet")).toBeVisible();
        expect(screen.getByText("Change from previous month")).toBeVisible();
        expect(document.querySelector(".accounts-distribution__stack")).toBeInTheDocument();
        expect(document.querySelectorAll(".accounts-distribution__segment")).toHaveLength(
            accountsVisualFixtureMeta.expectedDistributionOrder.length,
        );
        expect(document.querySelector(".accounts-distribution__bar")).not.toBeInTheDocument();
        const fixtureGroup = (await screen.findAllByRole("button", {
            name: "accounts.group.collapse",
        }))[0];
        expect(fixtureGroup).toHaveAttribute("aria-expanded", "true");

        await userEvent.setup().click(fixtureGroup);

        expect(fixtureGroup).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("UZS main wallet")).not.toBeInTheDocument();
        expect(accountsVisualFixtureMeta.collapsedStateCurrency).toBe("UZS");
    });
});
