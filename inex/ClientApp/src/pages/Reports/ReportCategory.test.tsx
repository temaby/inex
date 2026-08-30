import { configureStore } from "@reduxjs/toolkit";
import { render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import reportSlice from "../../store/report/report-slice";
import { reportApi } from "../../store/report/report-api";
import transactionsSlice from "../../store/transactions/transactions-slice";
import { categoriesApi } from "../../store/categories/categories-api";
import {
    reportsVisualFixtureCategories,
    reportsVisualFixtureCategoryReport,
} from "../../test/fixtures/reportsVisualFixture";
import ReportCategory from "./ReportCategory";

const apiClientMock = vi.hoisted(() => vi.fn());

vi.mock("../../utils/apiClient", () => ({
    default: apiClientMock,
}));

vi.mock("react-i18next", async (importOriginal) => ({
    ...await importOriginal<typeof import("react-i18next")>(),
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

const makeStore = () => configureStore({
    reducer: {
        report: reportSlice.reducer,
        transactions: transactionsSlice.reducer,
        [reportApi.reducerPath]: reportApi.reducer,
        [categoriesApi.reducerPath]: categoriesApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(
        reportApi.middleware,
        categoriesApi.middleware,
    ),
});

describe("ReportCategory", () => {
    beforeEach(() => {
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
        apiClientMock.mockImplementation(async ({ url }: { url: string }) => {
            if (url === "/categories?mode=ALL") {
                return { data: { data: reportsVisualFixtureCategories } };
            }

            if (url.startsWith("/reports/category?filter=")) {
                return { data: reportsVisualFixtureCategoryReport };
            }

            return { data: null };
        });
    });

    it("renders the internal-transfer summary independently from category totals", async () => {
        render(
            <Provider store={makeStore()}>
                <MemoryRouter initialEntries={["/reports/category?interval=2026-04"]}>
                    <ReportCategory />
                </MemoryRouter>
            </Provider>,
        );

        const summary = await screen.findByRole("region", { name: "reports.internalTransfers" });

        expect(within(summary).getByText("reports.internalTransfersReceived")).toBeVisible();
        expect(within(summary).getByText("reports.internalTransfersSent")).toBeVisible();
        expect(within(summary).getByText("reports.internalTransfersNetChange")).toBeVisible();
        expect(within(summary).getByText("reports.internalTransfersCount")).toBeVisible();
        expect(within(summary).getByText("3")).toBeVisible();
        expect(within(summary).getByText("740.00 USD")).toBeVisible();
        expect(within(summary).getByText("-280.00 USD")).toBeVisible();
        expect(within(summary).getByText("460.00 USD")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Internal transfer" })).not.toBeInTheDocument();
    });
});
