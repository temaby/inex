import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import { budgetsApi } from "../store/budgets/budgets-api";
import { budgetReportApi } from "../store/budgetReport/budgetReport-api";
import { categoriesApi } from "../store/categories/categories-api";
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

const makeStore = () =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
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
});
