import { configureStore } from "@reduxjs/toolkit";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import dayjs from "dayjs";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";

import reportSlice from "../../store/report/report-slice";
import { reportApi } from "../../store/report/report-api";
import transactionsSlice from "../../store/transactions/transactions-slice";
import linkedAccountSlice from "../../store/linkedAccount/linked-account-slice";
import { categoriesApi } from "../../store/categories/categories-api";
import {
    reportsVisualFixtureCategories,
    reportsVisualFixtureCategoryReport,
} from "../../test/fixtures/reportsVisualFixture";
import ReportCategory from "./ReportCategory";

const { apiClientMock, language } = vi.hoisted(() => ({
    apiClientMock: vi.fn(),
    language: { current: "en" },
}));

vi.mock("../../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string, options?: { category?: string }) => options?.category ? `${key} ${options.category}` : key,
        i18n: { language: language.current },
    }),
}));

const makeStore = () => configureStore({
    reducer: {
        report: reportSlice.reducer,
        transactions: transactionsSlice.reducer,
        linkedAccount: linkedAccountSlice.reducer,
        [reportApi.reducerPath]: reportApi.reducer,
        [categoriesApi.reducerPath]: categoriesApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(
        reportApi.middleware,
        categoriesApi.middleware,
    ),
});

const renderReport = (report = reportsVisualFixtureCategoryReport) => {
    apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
        if (url === "/categories?mode=ALL") {
            return { data: { data: reportsVisualFixtureCategories } };
        }
        if (url.startsWith("/reports/category?filter=")) {
            return { data: report };
        }
        return { data: null };
    });
    return render(
        <Provider store={makeStore()}>
            <MemoryRouter initialEntries={["/reports/category?interval=2026-04"]}>
                <Routes>
                    <Route element={<Outlet context={{ reportMonth: dayjs("2026-04") }} />}>
                        <Route path="/reports/category" element={<ReportCategory />} />
                    </Route>
                    <Route path="/transactions" element={<div>Transactions</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
};

describe("ReportCategory", () => {
    beforeEach(() => {
        language.current = "en";
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
    });

    it("renders the internal-transfer summary independently from category totals", async () => {
        renderReport();
        const toggle = await screen.findByText("reports.internalTransfers");
        const details = toggle.closest("details");
        expect(details).toHaveAttribute("open");
        const metrics = within(details!.querySelector("dl")!);
        expect(metrics.getByText("reports.internalTransfersReceived")).toBeVisible();
        expect(metrics.getByText("reports.internalTransfersSent")).toBeVisible();
        expect(metrics.getByText("reports.internalTransfersNetChange")).toBeVisible();
        expect(metrics.getByText("reports.internalTransfersCount")).toBeVisible();
        expect(metrics.getByText("3")).toBeVisible();
        expect(details!.querySelector("dl")).toHaveTextContent("740.00 USDreports.internalTransfersSent-280.00 USDreports.internalTransfersNetChange460.00 USD");
        await userEvent.click(toggle);
        expect(details).not.toHaveAttribute("open");
        expect(screen.queryByRole("button", { name: "Internal transfer" })).not.toBeInTheDocument();
    });

    it("uses the same expenses denominator for parent and child rows without counting transfers", async () => {
        renderReport();
        const categoryButton = await screen.findByRole("button", { name: "Living" });
        const table = within(categoryButton.closest("table")!);
        const living = await table.findByRole("row", { name: /Living/ });
        expect(living).toHaveTextContent("27.3%-575.00 USD");
        expect(table.getByRole("row", { name: /Home/ })).toHaveTextContent("72.7%-1,530.00 USD");
        expect(table.getByRole("row", { name: /Income/ })).toHaveTextContent("100%3,200.00 USD");

        const expand = within(living).getByRole("button", { name: "reports.expandCategory Living" });
        await userEvent.click(expand);
        expect(expand).toHaveAttribute("aria-expanded", "true");
        expect(table.getByRole("row", { name: /Groceries/ })).toHaveTextContent("24%-505.00 USD");
        await userEvent.click(table.getByRole("button", { name: "reports.expandCategory Home" }));
        expect(expand).toHaveAttribute("aria-expanded", "false");
        expect(table.queryByRole("row", { name: /Groceries/ })).not.toBeInTheDocument();
        await userEvent.click(table.getByRole("button", { name: "Rent" }));
        expect(await screen.findByText("Transactions")).toBeVisible();
    });

    it.each([
        { name: "income only", values: [0, 0, 1000], shares: ["0%", "0%", "100%"] },
        { name: "expense only", values: [-0.001, -999.999, 0], shares: ["0%", "100%", "0%"] },
        { name: "zero totals", values: [0, 0, 0], shares: ["0%", "0%", "0%"] },
    ])("formats shares and currency for $name", async ({ values, shares }) => {
        const fixture = reportsVisualFixtureCategoryReport;
        language.current = "ru";
        renderReport({
            data: fixture.data.filter(({ id }) => [402, 405, 408].includes(id))
                .map((row, index) => ({ ...row, value: values[index] })),
            metadata: {
                ...fixture.metadata,
                currency: "JPY",
                internalTransfers: { amountReceived: 0, amountSent: 0, netChange: 0, transactionCount: 0 },
            },
        });

        const names = ["Living", "Home", "Income"];
        for (const [index, name] of names.entries()) {
            const button = await screen.findByRole("button", { name });
            const row = button.closest("tr")!;
            expect(within(row).getByText(new RegExp(`^${shares[index].replace("%", "\\s*%")}$`))).toBeVisible();
            expect(row).toHaveTextContent("JPY");
        }
        const summary = screen.getByRole("region", { name: "reports.summaryTitle" });
        expect(summary.textContent).not.toMatch(/[,.]\d|[-+]0 JPY/);
        const disclosure = screen.getByText("reports.internalTransfers").closest("details");
        expect(disclosure).not.toHaveAttribute("open");
    });
});
