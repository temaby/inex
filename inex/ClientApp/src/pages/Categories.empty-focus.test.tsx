import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import budgetsSlice from "../store/budgets/budgets-slice";
import { budgetsApi } from "../store/budgets/budgets-api";
import { categoriesApi } from "../store/categories/categories-api";
import ratesSlice from "../store/rates/rates-slice";
import Categories from "./Categories";

const apiClientMock = vi.hoisted(() => Object.assign(vi.fn(), { get: vi.fn() }));

vi.mock("../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        i18n: { language: "en" },
        t: (key: string, values?: Record<string, unknown>) => {
            if (key === "categories.countSummary") {
                return `${values?.visible} of ${values?.total} categories · ${values?.scope}`;
            }
            return key;
        },
    }),
}));

vi.mock("./Categories/CategoryCreateForm", () => ({
    default: ({
        onCreated,
        onSubmittingChange,
    }: {
        formId: string;
        onCreated: () => void;
        onError?: () => void;
        onSubmittingChange?: (submitting: boolean) => void;
    }) => (
        <button
            onClick={() => {
                onSubmittingChange?.(false);
                onCreated();
            }}
            type="button"
        >
            mock-create-category
        </button>
    ),
}));

vi.mock("./Categories/CategoryInlineEdit", () => ({
    CategoryInlineEdit: () => <div>mock-category-edit</div>,
}));

const makeStore = () =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            budgets: budgetsSlice.reducer,
            rates: ratesSlice.reducer,
            [budgetsApi.reducerPath]: budgetsApi.reducer,
            [categoriesApi.reducerPath]: categoriesApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(budgetsApi.middleware, categoriesApi.middleware),
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

describe("Categories empty-state create focus", () => {
    beforeEach(() => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/categories?mode=ALL") {
                return { data: { data: [] } };
            }
            if (url === "/budgets") {
                return { data: { data: [] } };
            }
            return { data: null };
        });
        apiClientMock.get.mockImplementation(async (url: string) => {
            if (url === "/transactions") {
                return { data: { data: [], metadata: { totalItems: 0 } } };
            }
            if (url === "/currencies") {
                return { data: [{ id: 1, key: "USD" }] };
            }
            return { data: null };
        });
    });

    it("returns focus to the mounted page-head Add category button after first create", async () => {
        const user = userEvent.setup();
        const store = makeStore();

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        const emptyRegion = await screen.findByRole("region", { name: "categories.emptyState.title" });
        await user.click(within(emptyRegion).getByRole("button", { name: "categories.emptyState.addManually" }));
        await user.click(await screen.findByRole("button", { name: "mock-create-category" }));

        act(() => {
            store.dispatch(categoriesApi.util.upsertQueryData("getCategories", "ALL", [{
                id: 1,
                key: "groceries",
                name: "Groceries",
                description: "Created in test",
                parentId: null,
                isEnabled: true,
                isSystem: false,
                systemCode: null,
            }]));
        });

        await waitFor(() => {
            expect(document.activeElement).toHaveTextContent("categories.addCategory");
        });
        expect(screen.getByText("Groceries")).toBeInTheDocument();
    });
});
