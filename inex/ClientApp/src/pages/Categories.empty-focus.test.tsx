import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authSlice from "../store/auth/auth-slice";
import budgetsSlice from "../store/budgets/budgets-slice";
import { budgetsApi } from "../store/budgets/budgets-api";
import { categoriesApi } from "../store/categories/categories-api";
import type { CategoryResponse } from "../store/categories/categories-api";
import ratesSlice from "../store/rates/rates-slice";
import linkedAccountSlice from "../store/linkedAccount/linked-account-slice";
import Categories from "./Categories";
import { getTreeExpansionStorageKey } from "./tree-expansion-preferences";

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
            if (key === "categories.drawer.edit") {
                return `Edit ${values?.category}`;
            }
            if (key === "errors.name.max_length") return "Category name is too long";
            if (key.startsWith("errors.category-delete-")) return `Localized ${key}`;
            return key;
        },
    }),
}));

const makeStore = (withLinkedAccount = false) =>
    configureStore({
        reducer: {
            auth: authSlice.reducer,
            budgets: budgetsSlice.reducer,
            rates: ratesSlice.reducer,
            linkedAccount: linkedAccountSlice.reducer,
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

const category = (id: number, name: string, overrides: Partial<CategoryResponse> = {}): CategoryResponse => ({
    id, name, key: name.toLowerCase(), parentId: null, description: null,
    isEnabled: true, isSystem: false, systemCode: null, ...overrides,
});

const renderCategories = () => render(
    <Provider store={makeStore()}>
        <MemoryRouter><Categories /></MemoryRouter>
    </Provider>,
);

describe("Categories drawer and list", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
        window.localStorage.clear();
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

    afterEach(() => vi.unstubAllGlobals());

    it("uses linked category data and exposes no mutation controls in linked mode", async () => {
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/categories?mode=ALL&linkedUserId=2") {
                return { data: { data: [{
                    id: 10,
                    key: "linked-category",
                    name: "Linked category",
                    description: null,
                    parentId: null,
                    isEnabled: true,
                    isSystem: false,
                    systemCode: null,
                }] } };
            }
            return { data: { data: [] } };
        });

        render(
            <Provider store={makeStore(true)}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        expect(await screen.findByText("Linked category")).toBeVisible();
        expect(screen.queryByRole("button", { name: "categories.addCategory" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit Linked category" })).not.toBeInTheDocument();
        expect(screen.getByText("linkedAccount.readOnly")).toBeVisible();
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/categories?mode=ALL&linkedUserId=2",
        }));
    });

    it("returns focus to the mounted page-head Add category button after first create", async () => {
        const user = userEvent.setup();
        const store = makeStore();
        const categories: CategoryResponse[] = [];
        let completeRefresh: () => void = () => undefined;
        const refresh = new Promise<void>((resolve) => { completeRefresh = resolve; });
        apiClientMock.mockImplementation(async ({ url, method, data }) => {
            if (url === "/categories" && method === "post") {
                categories.push(category(1, data.name, data));
                return { data: { id: 1 } };
            }
            if (url === "/categories?mode=ALL") {
                if (categories.length > 0) await refresh;
                return { data: { data: [...categories] } };
            }
            return { data: { data: [] } };
        });

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        const emptyRegion = await screen.findByRole("region", { name: "categories.emptyState.title" });
        await user.click(within(emptyRegion).getByRole("button", { name: "categories.emptyState.addManually" }));
        const drawer = await screen.findByRole("dialog");
        const create = within(drawer).getByRole("button", { name: "common.create" });
        await user.click(create);
        expect(await within(drawer).findByText("errors.name.required")).toBeVisible();
        await user.type(within(drawer).getByRole("textbox", { name: "categories.name" }), "Groceries");
        await user.click(create);

        await waitFor(() => {
            expect(document.activeElement).toHaveTextContent("categories.addCategory");
        });
        expect(emptyRegion).toBeInTheDocument();
        completeRefresh();
        expect(await screen.findByText("Groceries")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "categories.addCategory" })).toHaveFocus();
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/categories", method: "post",
            data: { key: "groceries", name: "Groceries", description: "", parentId: null, isEnabled: true },
        }));
    });

    it("keeps collapsed descendants discoverable through search without opening the editor", async () => {
        const user = userEvent.setup();
        const store = makeStore();
        const categories = [
            {
                id: 1,
                key: "food",
                name: "Food",
                description: null,
                parentId: null,
                isEnabled: true,
                isSystem: false,
                systemCode: null,
            },
            {
                id: 2,
                key: "groceries",
                name: "Groceries",
                description: null,
                parentId: 1,
                isEnabled: true,
                isSystem: false,
                systemCode: null,
            },
        ];
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/categories?mode=ALL") {
                return { data: { data: categories } };
            }
            if (url === "/budgets") {
                return { data: { data: [] } };
            }
            return { data: null };
        });

        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        const branchToggle = await screen.findByRole("button", { name: "categories.branch.collapse" });
        await user.click(branchToggle);
        expect(branchToggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await user.type(screen.getByRole("searchbox", { name: "categories.search.label" }), "groceries");
        expect(screen.getByText("Food")).toBeInTheDocument();
        const groceriesRow = screen.getByText("Groceries").closest(".category-row");
        expect(groceriesRow).not.toBeNull();

        const rowButton = within(groceriesRow as HTMLElement).getByRole("button", { name: "Edit Groceries" });
        rowButton.focus();
        await user.keyboard("{Enter}");
        const drawer = await screen.findByRole("dialog");
        expect(within(drawer).getByRole("textbox", { name: "categories.parentCategory" })).toHaveValue("Food");
        await user.click(within(drawer).getByRole("button", { name: "common.cancel" }));
        await waitFor(() => expect(rowButton).toHaveFocus());
        expect(branchToggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByRole("searchbox")).toHaveValue("groceries");
    });

    it("restores a saved category branch independently from account groups", async () => {
        window.localStorage.setItem(getTreeExpansionStorageKey("categories", 1), JSON.stringify(["1", "removed-category"]));
        const categories = [
            { id: 1, key: "food", name: "Food", description: null, parentId: null, isEnabled: true, isSystem: false, systemCode: null },
            { id: 2, key: "groceries", name: "Groceries", description: null, parentId: 1, isEnabled: true, isSystem: false, systemCode: null },
        ];
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/categories?mode=ALL") return { data: { data: categories } };
            if (url === "/budgets") return { data: { data: [] } };
            return { data: null };
        });

        render(
            <Provider store={makeStore()}>
                <MemoryRouter>
                    <Categories />
                </MemoryRouter>
            </Provider>,
        );

        const branchToggle = await screen.findByRole("button", { name: "categories.branch.expand" });
        expect(branchToggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    });

    it("creates a child using only eligible parent options and leaves the collapsed tree intact", async () => {
        const user = userEvent.setup();
        const categories = [
            category(1, "Food"), category(2, "Groceries", { parentId: 1 }),
            category(3, "Inactive", { isEnabled: false }), category(4, "System", { isSystem: true }),
        ];
        apiClientMock.mockImplementation(async ({ url, method, data }) => {
            if (url === "/categories" && method === "post") {
                categories.push(category(5, data.name, data));
                return { data: { id: 5 } };
            }
            return { data: { data: url === "/categories?mode=ALL" ? [...categories] : [] } };
        });
        renderCategories();

        const branch = await screen.findByRole("button", { name: "categories.branch.collapse" });
        await user.click(branch);
        await user.click(screen.getByRole("button", { name: "categories.addCategory" }));
        const drawer = within(await screen.findByRole("dialog"));
        const parent = drawer.getByRole("combobox", { name: "categories.parentCategory" });
        await user.click(parent);
        expect(await screen.findAllByRole("option")).toHaveLength(1);
        await user.click(screen.getByText("Food", { selector: ".ant-select-item-option-content" }));
        await user.type(drawer.getByRole("textbox", { name: "categories.name" }), "Dining");
        await user.click(drawer.getByRole("button", { name: "common.create" }));
        await screen.findByText("categories.formSuccess.create");

        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/categories", method: "post", data: expect.objectContaining({ name: "Dining", parentId: 1 }),
        }));
        expect(branch).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("button", { name: "Edit Dining" })).not.toBeInTheDocument();
        await user.click(branch);
        expect(await screen.findByRole("button", { name: "Edit Dining" })).toBeVisible();
    });

    it("keeps failed edits, saves an inactive category in By spend, and preserves the filters", async () => {
        const user = userEvent.setup();
        const current = category(2, "Groceries", { parentId: 1, description: "Weekly", isEnabled: false });
        let attempt = 0;
        apiClientMock.mockImplementation(async ({ url, method, data }) => {
            if (url === "/categories/2" && method === "put") {
                if (attempt++ === 0) throw { response: { status: 422, data: { errors: { name: ["name.max_length"] } } } };
                Object.assign(current, data);
            }
            const period = new Date();
            const budgets = [{
                id: 1, name: "Weekly shopping", categoryIds: [2], value: 80,
                month: period.getMonth() + 1, year: period.getFullYear(),
            }];
            return { data: { data: url === "/categories?mode=ALL" ? [category(1, "Food"), { ...current }] : budgets } };
        });
        apiClientMock.get.mockImplementation(async (url: string) => url === "/currencies"
            ? { data: [{ id: 1, key: "USD" }] }
            : { data: { data: [{
                id: 1, accountId: 1, categoryId: 2, created: new Date().toISOString(), amount: -30,
                accountCurrency: "USD", tags: [], refs: [],
            }], metadata: { totalItems: 1 } } });
        renderCategories();

        await user.click(await screen.findByRole("button", { name: "categories.scope.all" }));
        const spendView = screen.getByRole("button", { name: "categories.view.bySpend" });
        await user.click(spendView);
        const search = screen.getByRole("searchbox");
        await user.type(search, "groceries");
        await user.click(await screen.findByRole("button", { name: "Edit Groceries" }));
        const drawer = within(await screen.findByRole("dialog"));
        const name = drawer.getByRole("textbox", { name: "categories.name" });
        const description = drawer.getByRole("textbox", { name: "categories.description" });
        const active = drawer.getByRole("switch", { name: "categories.drawer.activeSetting" });
        const save = drawer.getByRole("button", { name: "common.save" });
        expect(name).toHaveValue("Groceries");
        expect(description).toHaveValue("Weekly");
        expect(active).not.toBeChecked();
        expect(save).toBeDisabled();
        const summary = drawer.getByText("categories.drawer.information");
        expect(summary.closest("details")).not.toHaveAttribute("open");
        await user.click(summary);
        expect(summary.closest("details")).toHaveAttribute("open");
        expect(await drawer.findByText(/Weekly shopping/)).toBeVisible();
        expect(drawer.getByText("categories.snapshot.transactions").nextElementSibling).toHaveTextContent("1");
        await user.type(description, " updated");
        await user.click(active);
        await user.click(save);

        expect(await drawer.findByText("Category name is too long")).toBeVisible();
        expect(description).toHaveValue("Weekly updated");
        expect(active).toBeChecked();
        await user.click(save);
        await screen.findByText("categories.formSuccess.update");
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/categories/2", method: "put",
            data: { id: 2, key: "groceries", name: "Groceries", description: "Weekly updated", isEnabled: true },
        }));
        expect(search).toHaveValue("groceries");
        expect(spendView).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "categories.scope.all" })).toHaveAttribute("aria-pressed", "true");
        expect(await screen.findByText("Weekly updated")).toBeVisible();
    });

    it("confirms dirty cancellation and restores row focus after discarding", async () => {
        const user = userEvent.setup();
        apiClientMock.mockImplementation(async ({ url }) => ({ data: { data: url === "/categories?mode=ALL"
            ? [category(1, "Food")]
            : [] } }));
        renderCategories();
        const row = await screen.findByRole("button", { name: "Edit Food" });
        await user.click(row);
        const drawer = within(await screen.findByRole("dialog"));
        expect(drawer.getByRole("textbox", { name: "categories.parentCategory" })).toHaveValue("categories.drawer.noParent");
        const name = drawer.getByRole("textbox", { name: "categories.name" });
        await user.type(name, " renamed");
        await user.click(drawer.getByRole("button", { name: "common.cancel" }));
        await user.click(await screen.findByRole("button", { name: "categories.keepEditing" }));
        expect(name).toHaveValue("Food renamed");
        await user.click(drawer.getByRole("button", { name: "common.cancel" }));
        await user.click(await screen.findByRole("button", { name: "categories.discardChanges" }));
        await waitFor(() => expect(row).toHaveFocus());
        await user.click(row);
        expect(within(await screen.findByRole("dialog")).getByRole("textbox", { name: "categories.name" })).toHaveValue("Food");
    });

    it("edits root categories and opens system categories read-only", async () => {
        const user = userEvent.setup();
        apiClientMock.mockImplementation(async ({ url }) => ({ data: { data: url === "/categories?mode=ALL"
            ? [category(1, "Food"), category(2, "System", { isSystem: true })]
            : [] } }));
        renderCategories();
        await user.click(await screen.findByRole("button", { name: "Edit Food" }));
        const drawer = within(await screen.findByRole("dialog"));
        await user.type(drawer.getByRole("textbox", { name: "categories.description" }), "Root note");
        await user.click(drawer.getByRole("button", { name: "common.save" }));
        await screen.findByText("categories.formSuccess.update");
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({
            url: "/categories/1", method: "put", data: expect.objectContaining({ description: "Root note" }),
        }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: "Edit System" }));
        const systemDrawer = within(await screen.findByRole("dialog"));
        expect(systemDrawer.getByRole("textbox", { name: "categories.name" })).toBeDisabled();
        expect(systemDrawer.getByRole("switch")).toBeDisabled();
        expect(systemDrawer.queryByRole("button", { name: "common.save" })).not.toBeInTheDocument();
        expect(systemDrawer.queryByRole("button", { name: "common.delete" })).not.toBeInTheDocument();
    });

    it.each([
        { name: "children", rule: "category-delete-has-children" },
        { name: "historical transactions", rule: "category-delete-has-transactions" },
        { name: "historical budgets", rule: "category-delete-has-budgets" },
        { name: "no links", rule: null },
        { name: "an unused subcategory", rule: null, child: true },
    ])("handles the server's delete decision for $name after confirmation", async ({ rule, child }) => {
        const user = userEvent.setup();
        const id = child ? 2 : 1;
        const editedName = child ? "Groceries" : "Food";
        const deleteUrl = `/categories/${id}`;
        let categories = [category(1, "Food")];
        if (child) categories.push(category(id, editedName, { parentId: 1 }));
        apiClientMock.mockImplementation(async ({ url, method }) => {
            if (url === deleteUrl && method === "delete") {
                if (rule) {
                    throw { response: { status: 422, data: { rule, detail: "Untranslated server message" } } };
                }
                categories = categories.filter((item) => item.id !== id);
            }
            return { data: { data: url === "/categories?mode=ALL" ? [...categories] : [] } };
        });
        renderCategories();
        await user.click(await screen.findByRole("button", { name: `Edit ${editedName}` }));
        const deleteButton = within(await screen.findByRole("dialog")).getByRole("button", { name: "common.delete" });
        deleteButton.focus();
        await user.keyboard("{Enter}");
        const confirmButton = await screen.findByRole("button", { name: "categories.delete" });
        expect(screen.getByText("categories.deleteConfirm")).toBeInTheDocument();
        const dialog = confirmButton.closest('[role="dialog"]');
        await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
        for (let tab = 0; tab < 4 && document.activeElement !== confirmButton; tab += 1) {
            await user.tab();
        }
        expect(confirmButton).toHaveFocus();
        await user.keyboard("{Enter}");

        if (rule) {
            expect(await screen.findByText(`Localized errors.${rule}`)).toBeVisible();
            expect(screen.getByRole("button", { name: "common.delete" })).toBeEnabled();
        } else {
            expect(await screen.findByText("categories.formSuccess.delete")).toBeVisible();
            await waitFor(() => expect(screen.queryByRole("button", { name: `Edit ${editedName}` })).not.toBeInTheDocument());
            if (child) expect(screen.getByRole("button", { name: "Edit Food" })).toBeVisible();
        }
        expect(apiClientMock).toHaveBeenCalledWith(expect.objectContaining({ url: deleteUrl, method: "delete" }));
        expect(apiClientMock.get).not.toHaveBeenCalledWith("/budgets");
        expect(apiClientMock.get).not.toHaveBeenCalledWith("/transactions", {
            params: { categoryId: id, mode: "ALL", page: 1, pageSize: 1 },
        });
    });
});
