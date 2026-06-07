import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import budgetsSlice from "../store/budgets/budgets-slice";
import ratesSlice from "../store/rates/rates-slice";
import { budgetsApi } from "../store/budgets/budgets-api";
import { categoriesApi } from "../store/categories/categories-api";
import { transactionsApi } from "../store/transactions/transactions-api";
import Categories from "./Categories";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));

vi.mock("../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        i18n: { language: "en" },
        t: (key: string) => key,
    }),
}));

vi.mock("./Categories/CategoryRow", () => ({
    CategoryRow: ({
        category,
        stats,
        statsAvailable,
    }: {
        category: { name: string };
        stats?: { totalSpend: number };
        statsAvailable: boolean;
    }) => (
        <div data-testid="category-row">
            {category.name}:{String(statsAvailable)}:{stats?.totalSpend ?? "none"}
        </div>
    ),
}));

vi.mock("./Categories/CategoryInlineEdit", () => ({
    CategoryInlineEdit: () => <div>mock-category-edit</div>,
}));

const makeStore = () =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            rates: ratesSlice.reducer,
            budgets: budgetsSlice.reducer,
            [budgetsApi.reducerPath]: budgetsApi.reducer,
            [categoriesApi.reducerPath]: categoriesApi.reducer,
            [transactionsApi.reducerPath]: transactionsApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(
                budgetsApi.middleware,
                categoriesApi.middleware,
                transactionsApi.middleware,
            ),
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
            budgets: {
                items: [],
                isLoading: false,
                isCreating: false,
                isUpdating: false,
                lastUpdate: 0,
                error: null,
            },
        },
    });

describe("Categories transaction source", () => {
    beforeEach(() => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
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

            if (url === "/budgets") {
                return { data: { data: [] } };
            }

            return { data: null };
        });

        apiClientMock.get.mockImplementation(async (url: string) => {
            if (url === "/currencies") {
                return { data: [{ id: 1, key: "PLN" }] };
            }

            if (url === "/transactions") {
                throw new Error("direct all-mode fetch failed");
            }

            return { data: null };
        });
    });

    it("does not use active-only transaction cache when all-mode category spend fetch is unavailable", async () => {
        const store = makeStore();
        store.dispatch(transactionsApi.util.upsertQueryData("getTransactions", {
            pageSize: 20,
            page: 1,
            filter: {
                accountIds: [],
                categoryIds: [],
                tags: [],
                refs: [],
                range: [],
            },
        }, {
            data: [{
                id: 1,
                accountId: 1,
                categoryId: 1,
                created: "2026-06-05T12:00:00",
                amount: -300,
                comment: "active-only cached spend",
                accountCurrency: "PLN",
                tags: [],
                refs: [],
            }],
            metadata: { totalItems: 1 },
        }));

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByTestId("category-row")).toHaveTextContent("Food:false:0");
    });
});
