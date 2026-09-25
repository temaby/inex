import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import authSlice from "../../store/auth/auth-slice";
import { accountsApi } from "../../store/accounts/accounts-api";
import linkedAccountSlice from "../../store/linkedAccount/linked-account-slice";
import Reports from "../Reports";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));

vi.mock("../../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: "en" },
    }),
}));

const makeStore = (linked: boolean) => configureStore({
    reducer: {
        auth: authSlice.reducer,
        linkedAccount: linkedAccountSlice.reducer,
        [accountsApi.reducerPath]: accountsApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(accountsApi.middleware),
    preloadedState: {
        auth: {
            accessToken: "token",
            expiresAt: Date.now() + 3_600_000,
            user: { id: 1, username: "master", email: "master@example.com", currencyId: 1, languageCode: "en" },
            isInitializing: false,
            error: null,
        },
        linkedAccount: {
            sessionUserId: 1,
            linkState: {
                state: "master" as const,
                masterAccount: null,
                linkedAccounts: [{
                    id: 2,
                    username: "linked-user",
                    email: "linked@example.com",
                    baseCurrency: "PLN",
                }],
            },
            selectedLinkedUserId: linked ? 2 : null,
            loading: false,
            unavailable: false,
        },
    },
});

const renderReports = (linked: boolean) => render(
    <Provider store={makeStore(linked)}>
        <MemoryRouter initialEntries={["/reports"]}>
            <Routes>
                <Route path="/reports" element={<Reports />}>
                    <Route index element={<div>report hub</div>} />
                </Route>
            </Routes>
        </MemoryRouter>
    </Provider>,
);

describe("Reports linked-account scope", () => {
    beforeEach(() => {
        apiClientMock.mockReset();
        apiClientMock.get.mockReset();
        apiClientMock.mockResolvedValue({
            data: {
                data: [{
                    id: 201,
                    key: "linked-pln",
                    name: "Linked PLN",
                    description: null,
                    isEnabled: true,
                    isFavourite: true,
                    currencyId: 2,
                    currency: "PLN",
                }],
            },
        });
        apiClientMock.get.mockImplementation(async (url: string) => {
            if (url === "/auth/link-state") {
                return {
                    data: {
                        state: "master",
                        linkedAccounts: [{ id: 2, username: "linked-user", email: null, baseCurrency: "PLN" }],
                    },
                };
            }
            return { data: new Blob(["pdf"], { type: "application/pdf" }) };
        });
        Object.defineProperty(URL, "createObjectURL", {
            configurable: true,
            value: vi.fn(() => "blob:report"),
        });
        Object.defineProperty(URL, "revokeObjectURL", {
            configurable: true,
            value: vi.fn(),
        });
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("shows read-only context and sends only singular linked scope for quick PDF export", async () => {
        const user = userEvent.setup();
        renderReports(true);

        expect(await screen.findByText("linkedAccount.readOnly")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "reports.monthlyPdfExport" }));

        await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledWith(
            "/reports/monthly-pdf",
            expect.objectContaining({
                params: expect.objectContaining({ linkedUserId: 2 }),
            }),
        ));
        const request = apiClientMock.get.mock.calls.find(([url]) => url === "/reports/monthly-pdf")?.[1];
        expect(request?.params).not.toHaveProperty("linkedUserIds");
    });

    it("keeps self-mode linked-user aggregation separate from singular view-as", async () => {
        const user = userEvent.setup();
        renderReports(false);

        await user.click(screen.getByRole("button", { name: "reports.configure" }));
        const linkedUsers = await screen.findByLabelText("reports.monthlyPdfLinkedUsersLabel");
        await user.click(linkedUsers);
        await user.click(await screen.findByText("linked-user"));
        await user.click(screen.getByRole("button", { name: "reports.monthlyPdfConfigureExport" }));

        await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledWith(
            "/reports/monthly-pdf",
            expect.objectContaining({
                params: expect.objectContaining({ linkedUserIds: [2] }),
            }),
        ));
        const request = apiClientMock.get.mock.calls.find(([url]) => url === "/reports/monthly-pdf")?.[1];
        expect(request?.params).not.toHaveProperty("linkedUserId");
    });
});
