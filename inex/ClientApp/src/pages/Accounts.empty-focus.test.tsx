import { StyleProvider } from "@ant-design/cssinjs";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render as renderTest, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import english from "../../public/locales/en/translation.json";
import russian from "../../public/locales/ru/translation.json";
import authSlice from "../store/auth/auth-slice";
import ratesSlice from "../store/rates/rates-slice";
import linkedAccountSlice from "../store/linkedAccount/linked-account-slice";
import { accountsApi } from "../store/accounts/accounts-api";
import Accounts from "./Accounts";
import { getTreeExpansionStorageKey } from "./tree-expansion-preferences";
import {
    accountsVisualFixtureAccounts,
    accountsVisualFixtureCurrencies,
    accountsVisualFixtureMeta,
    accountsVisualFixtureRates,
    accountsVisualFixtureSummaries,
} from "../test/fixtures/accountsVisualFixture";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));
const locale = vi.hoisted(() => ({ language: "en" }));
const translations = createInstance();
const render = (ui: React.ReactElement) => renderTest(<StyleProvider autoClear>{ui}</StyleProvider>);

vi.mock("../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        i18n: locale,
        t: (key: string, options?: Record<string, unknown>) => {
            if (key.startsWith("accounts.inventory.") || key.endsWith("Share") || key === "accounts.shareOfNetWorth"
                || key === "accounts.shareUnavailable" || key === "accounts.hero.balanceUnavailable"
                || key.startsWith("accounts.hero.distributionUnavailable.")) {
                return translations.getFixedT(locale.language)(key, options);
            }
            const labels: Record<string, string> = {
                "accounts.workspaceTitle": "Accounts",
                "accounts.searchPlaceholder": "Search accounts...",
                "accounts.toolbar.label": "Accounts inventory controls",
                "accounts.toolbar.statusLabel": "STATUS",
                "accounts.toolbar.viewLabel": "VIEW",
                "accounts.headers.account": "ACCOUNT",
                "accounts.headers.currency": "CURRENCY",
                "accounts.headers.share": "SHARE",
                "accounts.headers.balance": "BALANCE",
                "accounts.scope.active": "Active",
                "accounts.scope.all": "All",
                "accounts.view.byCurrency": "By currency",
                "accounts.view.flat": "Flat list",
                "accounts.editAccountAction": `Edit account ${String(options?.name)}`,
                "accounts.viewAccountAction": `View account information for ${String(options?.name)}`,
                "accounts.group.accountCountOne": `${String(options?.count)} account`,
                "accounts.group.accountCountOther": `${String(options?.count)} accounts`,
                "accounts.hero.momDeltaPercent": `${String(options?.value)} MoM`,
                "accounts.hero.momComparisonPeriod": "vs previous month",
                "accounts.hero.momComparisonFallback": "Change from previous month",
                "accounts.hero.baseEquivalentLabel": `${String(options?.currency)} equivalent`,
                "accounts.snapshot.rateValue": `${String(options?.value)} ${String(options?.baseCurrency)} / ${String(options?.currency)}`,
            };

            return labels[key] ?? key;
        },
    }),
}));

const makeStore = (
    rates = [] as typeof accountsVisualFixtureRates,
    withLinkedAccount = false,
) =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            rates: ratesSlice.reducer,
            linkedAccount: linkedAccountSlice.reducer,
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
                requestKey: null,
                completedKey: null,
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
                        baseCurrency: "USD",
                    }],
                } : null,
                selectedLinkedUserId: withLinkedAccount ? 2 : null,
                loading: false,
                unavailable: false,
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
        isFavourite: true,
        currencyId: 1,
        currency: "USD",
    },
    {
        id: 2,
        key: "card",
        name: "Card",
        description: "Daily card",
        isEnabled: true,
        isFavourite: true,
        currencyId: 1,
        currency: "USD",
    },
    {
        id: 3,
        key: "archive",
        name: "Archive",
        description: "Closed",
        isEnabled: false,
        isFavourite: true,
        currencyId: 1,
        currency: "USD",
    },
];

const populatedSummaries = [
    { ...populatedAccounts[0], value: 100, thisMonthNet: 10 },
    { ...populatedAccounts[1], value: 50, thisMonthNet: 5 },
    { ...populatedAccounts[2], value: 25, thisMonthNet: 2 },
];

describe("Accounts inventory and editor", () => {
    beforeAll(async () => {
        await translations.init({
            fallbackLng: "en",
            resources: {
                en: { translation: english },
                ru: { translation: russian },
            },
        });
    });
    beforeEach(() => {
        locale.language = "en";
        apiClientMock.mockClear();
        vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
        window.localStorage.clear();
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: [] } };
            }
            if (url === "/accounts/details?mode=all&ids[0]=1") {
                return { data: { data: [] } };
            }
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: [{ id: 1, key: "PLN" }] });
    });

    it("returns focus to the mounted header Add account button after first create", async () => {
        const user = userEvent.setup();
        const store = makeStore();
        let created = false;
        apiClientMock.mockImplementation(async ({ url, method }: { url: string; method?: string }) => {
            if (url === "/accounts" && method === "post") created = true;
            return { data: { data: url === "/accounts?mode=ALL" && created ? [populatedAccounts[0]] : [] } };
        });

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        const emptyRegion = await screen.findByRole("region", { name: "accounts.emptyState.title" });
        await user.click(within(emptyRegion).getByRole("button", { name: "accounts.emptyState.primaryAction" }));
        fireEvent.change(await screen.findByRole("textbox", { name: "accounts.name" }), { target: { value: "Cash wallet" } });
        fireEvent.mouseDown(screen.getByRole("combobox", { name: "accounts.currency" }));
        await user.click(await screen.findByText("PLN"));
        await user.click(screen.getByRole("button", { name: "common.create" }));

        await waitFor(() => {
            expect(document.activeElement).toHaveTextContent("accounts.addAccount");
        });
        expect(screen.getByText("Cash wallet")).toBeInTheDocument();
    });

    it("shows the appropriate columns and accounts summary for the view and filters", async () => {
        const user = userEvent.setup();
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: populatedAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=all")) {
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
        expect(within(viewControl).queryByText("VIEW")).not.toBeInTheDocument();
        expect(statusControl.closest(".accounts-toolbar__primary")).not.toBeNull();
        expect(viewControl.closest(".accounts-toolbar__filters")).not.toBeNull();
        const searchbox = screen.getByRole("searchbox", { name: "accounts.searchLabel" });
        expect(searchbox.closest(".accounts-toolbar__filters")).not.toBeNull();
        expect(searchbox).toHaveAttribute("placeholder", "Search accounts...");

        expect(screen.getByText("ACCOUNT")).toBeVisible();
        expect(screen.queryByText("CURRENCY")).not.toBeInTheDocument();
        expect(document.querySelector(".accounts-row__currency")).not.toBeInTheDocument();
        expect(document.querySelector(".accounts-row__action")).not.toBeInTheDocument();
        expect(screen.getByText("SHARE")).toBeVisible();
        expect(screen.getByText("BALANCE")).toBeVisible();
        expect(screen.getByText("2 accounts · 1 currency")).toBeVisible();
        expect(screen.queryByText("cash WALLET")).not.toBeInTheDocument();
        expect(screen.getByText("Daily card")).toBeVisible();
        expect(document.querySelector(".accounts-group__bar")).not.toBeInTheDocument();
        expect(document.querySelector(".accounts-currency-badge")).not.toBeInTheDocument();
        expect(document.querySelector(".accounts-group__title")).toHaveTextContent("USD");
        expect((document.querySelector(".accounts-group__marker") as HTMLElement).style.background).not.toBe("");
        expect(document.querySelector(".accounts-row--tree-leaf .accounts-row__connector")).toBeInTheDocument();
        expect(document.querySelector(".accounts-row--tree-leaf .accounts-row__marker")).toBeInTheDocument();

        await user.click(within(viewControl).getByRole("button", { name: "Flat list" }));
        expect(screen.getByText("CURRENCY")).toBeVisible();
        const cashRow = screen.getByRole("button", { name: "Edit account Cash wallet" });
        expect(cashRow.querySelector(".accounts-row__currency")).toHaveTextContent("USD");

        await user.type(searchbox, "Archive");
        expect(screen.getByText("Found 0 of 2 accounts")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Edit account Archive" })).not.toBeInTheDocument();
        await user.click(within(statusControl).getByRole("button", { name: "All" }));
        expect(screen.getByText("Found 1 of 3 accounts")).toBeVisible();
        expect(screen.getByRole("button", { name: "Edit account Archive" })).toBeVisible();
        await user.clear(searchbox);
        expect(screen.getByText("3 accounts · 1 currency")).toBeVisible();
    });

    it("renders fixture currency groups expanded by default and supports collapsed-state QA", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: accountsVisualFixtureAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=all")) {
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
        expect(screen.queryByText("Change from previous month")).not.toBeInTheDocument();
        expect(document.querySelector(".accounts-distribution__stack")).toBeInTheDocument();
        expect(document.querySelectorAll(".accounts-distribution__segment")).toHaveLength(
            accountsVisualFixtureMeta.expectedDistributionOrder.length,
        );
        expect(document.querySelector(".accounts-distribution__bar")).not.toBeInTheDocument();
        const fixtureGroup = (await screen.findAllByRole("button", {
            name: "accounts.group.collapse",
        }))[0];
        expect(fixtureGroup).toHaveAttribute("aria-expanded", "true");
        expect(fixtureGroup).toHaveAttribute("aria-controls", "hierarchy-children-UZS");

        await userEvent.setup().click(within(fixtureGroup).getByText("UZS"));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(fixtureGroup).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("UZS main wallet")).not.toBeInTheDocument();
        expect(accountsVisualFixtureMeta.collapsedStateCurrency).toBe("UZS");
    });

    it("restores a saved currency-group state without applying it to another tree", async () => {
        window.localStorage.setItem(getTreeExpansionStorageKey("accounts", 1), JSON.stringify(["UZS", "removed-currency"]));
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") return { data: { data: accountsVisualFixtureAccounts } };
            if (url.startsWith("/accounts/details?mode=all")) return { data: { data: accountsVisualFixtureSummaries } };
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });

        render(
            <Provider store={makeStore(accountsVisualFixtureRates)}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        const uzsGroup = await screen.findByRole("button", { name: "accounts.group.expand" });
        expect(uzsGroup).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("UZS main wallet")).not.toBeInTheDocument();
    });

    it("opens and closes the editor without expanding rows or resetting inventory state", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL") {
                return { data: { data: accountsVisualFixtureAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=all")) {
                return { data: { data: accountsVisualFixtureSummaries } };
            }
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        const user = userEvent.setup();
        const store = makeStore(accountsVisualFixtureRates);

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        await screen.findByText("UZS main wallet");
        const [uzsGroupToggle] = screen.getAllByRole("button", {
            name: "accounts.group.collapse",
        });
        await user.click(uzsGroupToggle);
        const searchbox = screen.getByRole("searchbox", { name: "accounts.searchLabel" });
        await user.type(searchbox, "USD operating");
        const accountRow = await screen.findByRole("button", { name: "Edit account USD operating" });
        await user.click(accountRow);

        const drawer = await screen.findByRole("dialog", { name: /accounts.editDrawerTitle/ });
        expect(within(drawer).getByRole("textbox", { name: "accounts.name" })).toHaveValue("USD operating");
        expect(accountRow).not.toHaveAttribute("aria-expanded");
        expect(accountRow.closest(".accounts-row-wrap")).not.toContainElement(drawer);
        const information = within(drawer).getByText("accounts.snapshot.title");
        expect(information.parentElement).not.toHaveAttribute("open");
        await user.click(information);
        expect(information.parentElement).toHaveAttribute("open");
        expect(within(drawer).getByText("accounts.snapshot.currentBalance")).toBeVisible();
        await user.click(within(drawer).getByRole("button", { name: "common.cancel" }));

        await waitFor(() => expect(drawer).not.toBeInTheDocument());
        expect(accountRow).toHaveFocus();
        expect(searchbox).toHaveValue("USD operating");
        expect(screen.queryByText("UZS main wallet")).not.toBeInTheDocument();
        expect(screen.getByText("USD operating")).toBeVisible();
        expect(document.querySelectorAll(".accounts-group")).toHaveLength(1);
        expect(apiClientMock.mock.calls.filter(([request]) => request.url === "/accounts?mode=ALL")).toHaveLength(1);
        await user.clear(searchbox);
        expect(await screen.findByRole("button", { name: "accounts.group.expand" })).toHaveAttribute("aria-controls", "hierarchy-children-UZS");
    });

    it("edits the focused flat row with the keyboard while preserving view and filters", async () => {
        const user = userEvent.setup();
        let archive = populatedAccounts[2];
        apiClientMock.mockImplementation(async ({ url, method, data }) => {
            if (url === "/accounts/3" && method === "put") {
                archive = { ...archive, ...data };
                return { data: null };
            }
            if (url.startsWith("/accounts/details")) {
                return { data: { data: populatedSummaries } };
            }
            return { data: { data: [...populatedAccounts.slice(0, 2), archive] } };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        render(
            <Provider store={makeStore(accountsVisualFixtureRates)}>
                <MemoryRouter><Accounts /></MemoryRouter>
            </Provider>,
        );

        const flat = screen.getByRole("button", { name: "Flat list" });
        const all = screen.getByRole("button", { name: "All" });
        await user.click(flat);
        await user.click(all);
        const search = screen.getByRole("searchbox", { name: "accounts.searchLabel" });
        await user.type(search, "Archive");
        const row = await screen.findByRole("button", { name: "Edit account Archive" });
        await user.tab();
        expect(screen.getByRole("button", { name: "accounts.clearSearch" })).toHaveFocus();
        await user.tab();
        expect(row).toHaveFocus();
        await user.keyboard("{Enter}");
        const firstDrawer = await screen.findByRole("dialog");
        expect(within(firstDrawer).getByRole("textbox", { name: "accounts.name" })).toHaveValue("Archive");
        await user.click(within(firstDrawer).getByRole("button", { name: "common.cancel" }));
        await waitFor(() => expect(row).toHaveFocus());

        await user.keyboard(" ");
        const drawer = await screen.findByRole("dialog");
        const name = within(drawer).getByRole("textbox", { name: "accounts.name" });
        await user.type(name, " updated");
        await user.click(within(drawer).getByRole("button", { name: "common.save" }));

        expect(await screen.findByRole("button", { name: "Edit account Archive updated" })).toBeVisible();
        await waitFor(() => expect(drawer).not.toBeInTheDocument());
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/accounts/3",
            method: "put",
            data: expect.objectContaining({ id: 3, key: "archive", name: "Archive updated" }),
        }));
        expect(flat).toHaveAttribute("aria-pressed", "true");
        expect(all).toHaveAttribute("aria-pressed", "true");
        expect(search).toHaveValue("Archive");
    });

    it.each([
        { scenario: "complete data", rate: true, balance: true, message: null },
        { scenario: "a missing rate", rate: false, balance: true, message: "Exchange rates are missing for some selected balances." },
        { scenario: "a missing balance", rate: true, balance: false, message: "Some selected accounts have unavailable balances." },
    ])("keeps totals, groups, and chart synchronized across scope changes with $scenario", async ({ rate, balance, message }) => {
        const archived = { ...populatedAccounts[2], currency: "EUR", currencyId: 20 };
        const zeroAccount = { ...archived, id: 4, name: "Empty wallet", currency: "JPY", currencyId: 21 };
        const accounts = [...populatedAccounts.slice(0, 2), archived, zeroAccount];
        const summaries = [
            ...populatedSummaries.slice(0, 2),
            { ...zeroAccount, value: 0, thisMonthNet: 0 },
            ...(balance ? [{ ...archived, value: 100, thisMonthNet: 0 }] : []),
        ];
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            const data = url.startsWith("/accounts/details?mode=all") ? summaries : accounts;
            return { data: { data } };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        const rates = rate ? [{ ...accountsVisualFixtureRates[0], currencyTo: "EUR", rate: 2 }] : [];
        const user = userEvent.setup();
        const { container } = render(
            <Provider store={makeStore(rates)}>
                <MemoryRouter><Accounts /></MemoryRouter>
            </Provider>,
        );
        const total = container.querySelector('[data-qa="hero-primary-value"]');
        const groupShare = (code: string) => container.querySelector(`#accounts-group-${code}-share`);
        const distributionShares = () => [...container.querySelectorAll(".accounts-distribution__share")]
            .map((share) => share.textContent);
        const segments = () => container.querySelectorAll(".accounts-distribution__segment");
        await waitFor(() => expect(total).toHaveTextContent("150.00"));

        for (let switchCount = 0; switchCount < 2; switchCount += 1) {
            expect(groupShare("USD")).toHaveTextContent("100.0%");
            expect(distributionShares()).toEqual(["100.0%"]);
            expect(segments()).toHaveLength(1);
            expect(groupShare("EUR")).toBeNull();

            await user.click(screen.getByRole("button", { name: "All" }));
            expect(groupShare("JPY")).toHaveTextContent("—");
            const inactiveRow = screen.getByRole("button", { name: "Edit account Archive" });
            expect(inactiveRow).toHaveTextContent(balance ? "100.00" : "Balance unavailable");
            if (message) {
                expect(total).toHaveTextContent("Balance unavailable");
                expect(screen.getByText(message)).toBeVisible();
                expect(groupShare("USD")).toHaveTextContent("Share unavailable");
                expect(distributionShares()).toEqual([]);
                expect(segments()).toHaveLength(0);
            } else {
                expect(total).toHaveTextContent("200.00");
                expect(groupShare("USD")).toHaveTextContent("75.0%");
                expect(groupShare("EUR")).toHaveTextContent("25.0%");
                expect(distributionShares()).toEqual(["75.0%", "25.0%"]);
                expect(segments()).toHaveLength(2);
            }
            await user.click(screen.getByRole("button", { name: "Active" }));
            expect(total).toHaveTextContent("150.00");
        }
        expect(apiClientMock.mock.calls.filter(([{ url }]) => url.startsWith("/accounts/details")))
            .toEqual([[expect.objectContaining({ url: "/accounts/details?mode=all&ids[0]=1&ids[1]=2&ids[2]=3&ids[3]=4" })]]);
    });

    it("formats Russian amounts, pluralizes counts, and distinguishes zero from tiny signed shares", async () => {
        locale.language = "ru";
        const accounts = accountsVisualFixtureAccounts.slice(0, 4);
        const values = [190860318.79, 0, 0.12, -0.13];
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => ({
            data: { data: url.startsWith("/accounts/details")
                ? accounts.map((account, index) => ({ ...account, value: values[index], thisMonthNet: 0 }))
                : accounts },
        }));
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        render(
            <Provider store={makeStore(accountsVisualFixtureRates)}>
                <MemoryRouter><Accounts /></MemoryRouter>
            </Provider>,
        );

        const uzsRow = await screen.findByRole("button", { name: "Edit account UZS main wallet" });
        expect(await within(uzsRow).findByText("190 860 318,79 UZS")).toBeVisible();
        expect(await within(uzsRow).findByText("15 905,03 USD")).toBeVisible();
        expect(screen.getByText("4 счёта · 4 валюты")).toBeVisible();

        const zeroRow = within(screen.getByRole("button", { name: "Edit account USD operating" }));
        expect(zeroRow.getAllByText("0,00 USD").length).toBeGreaterThan(0);
        expect(zeroRow.getByText("—")).toBeVisible();
        expect(document.getElementById("accounts-group-USD-share")).toHaveTextContent("—");
        const tinyRow = within(screen.getByRole("button", { name: "Edit account PLN card" }));
        expect(tinyRow.getByText("<0,1%")).toBeVisible();
        expect(document.getElementById("accounts-group-PLN-share")).toHaveTextContent("<0,1%");
        expect(document.querySelector('[data-qa="hero-distribution-legend"]')).toHaveTextContent("<0,1%");
        const negativeRow = screen.getByRole("button", { name: "Edit account BYN reserve" });
        expect(within(negativeRow).getByText("-0,13 BYN")).toBeVisible();
        expect(negativeRow.querySelector(".accounts-row__share")).toHaveTextContent(/-.*0,1/);
    });

    it.each([
        { currency: "UZS", value: 190860318.79, rate: 12000, amount: "190 860 318,79 UZS", equivalent: "15 905,03 USD", rateLabel: "0,00008333 USD / UZS" },
        { currency: "UZS", value: -1, rate: 12000, amount: "-1,00 UZS", equivalent: "0,00 USD", rateLabel: "0,00008333 USD / UZS" },
        { currency: "JPY", value: 0, rate: 1e10, amount: "0 JPY", equivalent: "0,00 USD", rateLabel: "0,0000000001 USD / JPY" },
        { currency: "KWD", value: -1.234, rate: 0.32, amount: "-1,234 KWD", equivalent: "-3,86 USD", rateLabel: "3,1250 USD / KWD" },
    ])("localizes $currency balances and reporting rates in account information", async ({ currency, value, rate, amount, equivalent, rateLabel }) => {
        locale.language = "ru";
        const account = { ...populatedAccounts[0], currency, currencyId: 7 };
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => ({
            data: { data: url.startsWith("/accounts/details") ? [{ ...account, value, thisMonthNet: 0 }] : [account] },
        }));
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        render(
            <Provider store={makeStore([{ ...accountsVisualFixtureRates[0], currencyTo: currency, rate }])}>
                <MemoryRouter><Accounts /></MemoryRouter>
            </Provider>,
        );
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Edit account Cash wallet" }));
        const drawer = within(await screen.findByRole("dialog", { name: /accounts.editDrawerTitle/ }));
        await user.click(drawer.getByText("accounts.snapshot.title"));
        expect(await drawer.findByText(amount)).toBeVisible();
        expect(drawer.getByText(equivalent)).toBeVisible();
        expect(drawer.getByText(rateLabel)).toBeVisible();
    });

    it("uses linked account queries and exposes no mutation controls in linked mode", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/accounts?mode=ALL&linkedUserId=2") {
                return { data: { data: populatedAccounts } };
            }
            if (url.startsWith("/accounts/details?mode=all") && url.includes("linkedUserId=2")) {
                return { data: { data: populatedSummaries } };
            }
            return { data: null };
        });
        apiClientMock.get.mockResolvedValue({ data: accountsVisualFixtureCurrencies });
        const user = userEvent.setup();

        render(
            <Provider store={makeStore(accountsVisualFixtureRates, true)}>
                <MemoryRouter>
                    <Accounts />
                </MemoryRouter>
            </Provider>,
        );

        const accountRow = await screen.findByRole("button", { name: "View account information for Cash wallet" });
        expect(screen.queryByRole("button", { name: "accounts.addAccount" })).not.toBeInTheDocument();
        expect(screen.getByText("linkedAccount.readOnly")).toBeVisible();

        await user.click(accountRow);

        const drawer = await screen.findByRole("dialog", { name: /accounts.snapshot.title/ });
        expect(within(drawer).getByText("accounts.snapshot.currentBalance")).toBeVisible();
        expect(within(drawer).queryByRole("textbox")).not.toBeInTheDocument();
        expect(within(drawer).queryByRole("button", { name: "accounts.delete" })).not.toBeInTheDocument();
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/accounts?mode=ALL&linkedUserId=2",
        }));
    });
});
