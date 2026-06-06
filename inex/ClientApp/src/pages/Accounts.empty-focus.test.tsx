import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import ratesSlice from "../store/rates/rates-slice";
import { accountsApi } from "../store/accounts/accounts-api";
import Accounts from "./Accounts";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));

vi.mock("../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string) => key,
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

const makeStore = () =>
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
                items: [],
                error: null,
            },
        },
    });

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
});
