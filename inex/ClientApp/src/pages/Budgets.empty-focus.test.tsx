import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import { budgetsApi } from "../store/budgets/budgets-api";
import { budgetReportApi } from "../store/budgetReport/budgetReport-api";
import { categoriesApi } from "../store/categories/categories-api";
import linkedAccountSlice from "../store/linkedAccount/linked-account-slice";
import Budgets from "./Budgets";

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

vi.mock("./Budgets/BudgetEditForm", () => ({
    default: () => <div>mock-budget-edit</div>,
}));

const delay = (milliseconds: number) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const makeStore = (withLinkedAccount = false) =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            linkedAccount: linkedAccountSlice.reducer,
            [budgetsApi.reducerPath]: budgetsApi.reducer,
            [budgetReportApi.reducerPath]: budgetReportApi.reducer,
            [categoriesApi.reducerPath]: categoriesApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(
                budgetsApi.middleware,
                budgetReportApi.middleware,
                categoriesApi.middleware,
            ),
        preloadedState: {
            auth: {
                accessToken: "token",
                expiresAt: Date.now() + 3_600_000,
                user: { id: 1, username: "qa", email: "qa@example.com", currencyId: 1, languageCode: "en" },
                isInitializing: false,
                error: null,
            },
            linkedAccount: withLinkedAccount ? {
                sessionUserId: 1,
                linkState: {
                    state: "master" as const,
                    masterAccount: null,
                    linkedAccounts: [{
                        id: 2,
                        username: "linked-user",
                        email: "linked@example.com",
                        baseCurrency: "EUR",
                    }],
                },
                selectedLinkedUserId: 2,
                loading: false,
                unavailable: false,
            } : {
                sessionUserId: 1,
                linkState: null,
                selectedLinkedUserId: null,
                loading: false,
                unavailable: false,
            },
        },
    });

describe("Budgets empty-state create focus", () => {
    beforeEach(() => {
        let created = false;

        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        apiClientMock.mockImplementation(async ({
            url,
            method = "get",
        }: {
            url: string;
            method?: string;
        }) => {
            if (url === "/budgets" && method === "get") {
                if (created) {
                    await delay(350);
                }

                return {
                    data: {
                        data: created
                            ? [{
                                id: 1,
                                key: "food-plan",
                                name: "Food plan",
                                description: "Created in test",
                                value: 400,
                                categoryIds: [1],
                                year: 2026,
                                month: 6,
                            }]
                            : [],
                    },
                };
            }

            if (url === "/budgets" && method === "post") {
                created = true;
                return { data: {} };
            }

            if (url === "/categories?mode=ALL") {
                return {
                    data: {
                        data: [{
                            id: 1,
                            key: "food",
                            name: "Food",
                            description: "",
                            parentId: null,
                            isEnabled: true,
                            isSystem: false,
                            systemCode: null,
                        }],
                    },
                };
            }

            if (url === "/reports/budget/comparison") {
                return {
                    data: {
                        data: [{
                            categoryName: "Food",
                            categoryIds: [1],
                            budgetedAmount: 400,
                            spentAmount: 125,
                            remainingAmount: 275,
                            percentageUsed: 31.25,
                        }],
                    },
                };
            }

            return { data: null };
        });

        apiClientMock.get.mockResolvedValue({
            data: [{ id: 1, key: "PLN", name: "Polish zloty" }],
        });
    });

    it("returns focus to the mounted Add budget button after delayed first-create refetch", async () => {
        const user = userEvent.setup();
        const store = makeStore();

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/budgets?year=2026&month=6"]}>
                    <Budgets />
                </MemoryRouter>
            </Provider>,
        );

        const emptyRegion = await screen.findByRole("region", { name: "budgets.emptyState.title" });
        await user.click(within(emptyRegion).getByRole("button", { name: "budgets.addBudget" }));
        fireEvent.change(await screen.findByPlaceholderText("budgets.keyPlaceholder"), {
            target: { value: "food-plan" },
        });
        fireEvent.change(screen.getByPlaceholderText("budgets.namePlaceholder"), {
            target: { value: "Food plan" },
        });
        fireEvent.change(screen.getByPlaceholderText("0.00"), {
            target: { value: "400" },
        });
        await user.click(screen.getByRole("button", { name: "budgets.create" }));

        await waitFor(() => {
            expect(document.activeElement).toHaveTextContent("budgets.addBudget");
        }, { timeout: 2000 });
        expect(await screen.findAllByText("Food plan", {}, { timeout: 3000 })).not.toHaveLength(0);
    }, 10_000);

    it("renders linked budgets read-only and keeps period expansion behavior", async () => {
        const user = userEvent.setup();
        apiClientMock.mockImplementation(async ({ url, params }: { url: string; params?: Record<string, unknown> }) => {
            if (url === "/budgets") {
                return { data: { data: [{
                    id: 2,
                    key: "linked-plan",
                    name: "Linked plan",
                    description: "Linked description",
                    value: 600,
                    categoryIds: [20],
                    year: Number(params?.year),
                    month: Number(params?.month),
                }] } };
            }
            if (url === "/categories?mode=ALL&linkedUserId=2") {
                return { data: { data: [{
                    id: 20,
                    key: "linked-category",
                    name: "Linked category",
                    description: "",
                    parentId: null,
                    isEnabled: true,
                    isSystem: false,
                    systemCode: null,
                }] } };
            }
            if (url === "/reports/budget/comparison") {
                return { data: { data: [{
                    categoryName: "Linked plan",
                    categoryIds: [20],
                    budgetedAmount: 600,
                    spentAmount: 150,
                    remainingAmount: 450,
                    percentageUsed: 25,
                }] } };
            }
            return { data: null };
        });
        const store = makeStore(true);

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/budgets?year=2026&month=6"]}>
                    <Budgets />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByText("linkedAccount.readOnly")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "budgets.addBudget" })).not.toBeInTheDocument();
        expect(screen.queryByText("mock-budget-edit")).not.toBeInTheDocument();
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/budgets",
            params: { year: 2026, month: 6, linkedUserId: 2 },
        }));
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/reports/budget/comparison",
            params: { year: 2026, month: 6, currency: "EUR", linkedUserId: 2 },
        }));

        await user.click(screen.getByRole("button", { name: /Linked plan/ }));
        expect(await screen.findByText("Linked description")).toBeInTheDocument();
        expect(screen.queryByText("mock-budget-edit")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "budgets.delete" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "budgets.save" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "budgets.nextMonth" }));
        await waitFor(() => expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/budgets",
            params: { year: 2026, month: 7, linkedUserId: 2 },
        })));
    });

    it("keeps the linked empty state read-only", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/budgets" || url === "/reports/budget/comparison") return { data: { data: [] } };
            if (url === "/categories?mode=ALL&linkedUserId=2") return { data: { data: [] } };
            return { data: null };
        });

        render(
            <Provider store={makeStore(true)}>
                <MemoryRouter initialEntries={["/budgets?year=2026&month=6"]}>
                    <Budgets />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByText("budgets.emptyState.title")).toBeInTheDocument();
        expect(screen.getAllByText("linkedAccount.readOnly")).not.toHaveLength(0);
        expect(screen.queryByRole("button", { name: "budgets.addBudget" })).not.toBeInTheDocument();
    });

    it("keeps the linked error state read-only", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/budgets") {
                throw { response: { status: 500, data: { detail: "Failed" } }, message: "Failed" };
            }
            if (url === "/categories?mode=ALL&linkedUserId=2") return { data: { data: [] } };
            if (url === "/reports/budget/comparison") return { data: { data: [] } };
            return { data: null };
        });

        render(
            <Provider store={makeStore(true)}>
                <MemoryRouter initialEntries={["/budgets?year=2026&month=6"]}>
                    <Budgets />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByText("budgets.error.loadTitle")).toBeInTheDocument();
        expect(screen.getAllByText("linkedAccount.readOnly")).not.toHaveLength(0);
        expect(screen.queryByRole("button", { name: "budgets.addBudget" })).not.toBeInTheDocument();
    });
});
