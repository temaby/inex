import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { FamilyStatistics } from "../../model/Report/FamilyStatistics";
import Dashboard from "../Dashboard";
import FamilyDashboard from "./FamilyDashboard";

const mocks = vi.hoisted(() => ({ query: vi.fn(), personal: vi.fn(), dispatch: vi.fn(), refresh: vi.fn(), links: vi.fn() }));
const totals = { balance: 1250, income: 900, expenses: 300, surplus: 600, balanceComplete: true, cashFlowComplete: true };
const fixture: FamilyStatistics = {
    year: 2026, month: 11, currency: "USD", balanceDate: "2026-11-07", totals,
    participants: [{ userId: 1, username: "Artiom", isMaster: true, totals }, { userId: 2, username: "Anna", isMaster: false, totals }],
    expenseCategories: [{ userId: 1, username: "Artiom", categoryId: 1, path: "Food", amount: 100 }, { userId: 2, username: "Anna", categoryId: 1, path: "Food", amount: 200 }],
    incomeCategories: [], missingRates: [],
};
const state = { auth: { user: { id: 1 } }, linkedAccount: { dashboardFamilySelected: true, linkState: { state: "master", linkedAccounts: [{ id: 2 }] } } };
vi.mock("../../store/hooks", () => ({ useAppDispatch: () => mocks.dispatch, useAppSelector: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock("../../store/report/report-api", () => ({ useGetFamilyStatisticsQuery: mocks.query }));
vi.mock("./useDashboardData", () => ({ useDashboardData: mocks.personal }));
vi.mock("../../store/linkedAccount/linked-account-actions", () => ({ fetchLinkedAccountContext: mocks.links }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("../../layouts/BasicPage", () => ({ default: ({ children, extra }: { children: React.ReactNode; extra: React.ReactNode }) => <main>{extra}{children}</main> }));
vi.mock("../../components/primitives", () => ({
    InExButton: ({ children, kind: _kind, size: _size, icon: _icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: string; size?: string; icon?: React.ReactNode }) => <button {...props}>{children}</button>,
    Num: ({ value, currency, dataQa }: { value: number; currency: string; dataQa?: string }) => <span data-qa={dataQa}>{currency} {value}</span>,
}));
vi.mock("recharts", () => ({ Cell: () => null, Pie: () => null, PieChart: () => null, ResponsiveContainer: () => null }));

const mount = (element = <FamilyDashboard />, route = "/dashboard") => render(<MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>);
const success = (data: FamilyStatistics = fixture) => ({ currentData: data, isFetching: false, isLoading: false, isError: false, refetch: mocks.refresh });

describe("Family dashboard", () => {
    beforeEach(() => { vi.clearAllMocks(); mocks.query.mockReturnValue(success()); });

    it("renders family on the dashboard route without mounting personal reads or ledger links", () => {
        const { container } = mount(<Dashboard />);
        expect(mocks.personal).not.toHaveBeenCalled();
        expect(container.querySelector('[data-qa="family-balance-total"]')).toHaveTextContent("USD 1250");
        expect(container.querySelector('[data-qa="family-surplus-total"]')).toHaveTextContent("USD 600");
        expect(screen.getAllByText("Food")).toHaveLength(2);
        expect(screen.queryByRole("link")).toBeNull();
        expect(screen.queryByText("dashboard.addTransaction")).toBeNull();
        expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({ sessionUserId: 1, membershipKey: "2" }), expect.objectContaining({ refetchOnMountOrArgChange: true }));
    });

    it("keeps current balance independent of selected historical month", () => {
        mount(<FamilyDashboard />, "/dashboard?month=2025-02");
        expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({ year: 2025, month: 2 }), expect.anything());
        expect(document.querySelector('[data-qa="family-balance-total"]')).toHaveTextContent("1250");
        fireEvent.click(document.querySelector('[data-qa="family-month-previous"]') as HTMLElement);
        expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2025, month: 1 }), expect.anything());
    });

    it("hides previous values and participant identities during reauthorization/refetch", () => {
        mocks.query.mockReturnValue({ ...success(), isFetching: true });
        const { container } = mount();
        expect(container.querySelector('[data-qa="family-balance-total"]')).toBeNull();
        expect(screen.queryByText("Artiom")).toBeNull();
        expect(screen.getByText("dashboard.family.loading")).toBeInTheDocument();
    });

    it("shows independent missing-rate states and only refetches cached statistics", () => {
        mocks.query.mockReturnValue(success({ ...fixture, totals: { ...totals, income: null, expenses: null, surplus: null, cashFlowComplete: false }, incomeCategories: null, expenseCategories: null,
            missingRates: [{ scope: "cashFlow", currency: "PLN", date: "2026-11-01" }] }));
        const { container } = mount();
        expect(container.querySelector('[data-qa="family-balance-total"]')).toHaveTextContent("1250");
        expect(container.querySelector('[data-qa="family-income-total"]')).toBeNull();
        fireEvent.click(container.querySelector('[data-qa="family-refresh"]') as HTMLElement);
        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("exits family and refreshes links when all family access is unavailable", () => {
        mocks.query.mockReturnValue({ ...success(), currentData: undefined, isError: true, error: { status: 404 } });
        mount();
        expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "linkedAccount/familyScopeUnavailable" }));
        expect(mocks.links).toHaveBeenCalledWith(1);
    });
});
