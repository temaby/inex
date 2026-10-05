import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard, { DASHBOARD_EXPENSE_COLORS, DASHBOARD_INCOME_COLORS } from "./Dashboard";

const apiMocks = vi.hoisted(() => ({
  accounts: vi.fn(),
  accountSummaries: vi.fn(),
  categories: vi.fn(),
  transactions: vi.fn(),
  transactionSummary: vi.fn(),
  dispatch: vi.fn(),
}));

const linkedState = {
  linkedAccount: {
    selectedLinkedUserId: 2,
    linkState: {
      linkedAccounts: [{ id: 2, username: "Linked QA", baseCurrency: "USD" }],
    },
  },
  rates: { items: [], cached: undefined },
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, options?: Record<string, unknown>) => options?.username
      ? `${key}:${String(options.username)}`
      : key,
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("../layouts/BasicPage", () => ({
  default: ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) => (
    <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>
  ),
}));

vi.mock("../components/primitives", () => ({
  InExButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick} type="button">{children}</button>
  ),
  Num: ({ currency, value }: { currency: string; value: number }) => <span>{currency} {value}</span>,
  SegmentedControl: () => <div>segmented-control</div>,
}));

vi.mock("recharts", () => ({
  Bar: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
  BarChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  CartesianGrid: () => null,
  Cell: () => null,
  Pie: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
  PieChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("../store/hooks", () => ({
  useAppDispatch: () => apiMocks.dispatch,
  useAppSelector: (selector: (state: typeof linkedState) => unknown) => selector(linkedState),
}));

vi.mock("../store/rates/rates-action", () => ({
  fetchCachedRatesForRange: vi.fn(),
}));

vi.mock("../store/accounts/accounts-api", () => ({
  useGetAccountsQuery: apiMocks.accounts,
  useGetAccountsSummaryQuery: apiMocks.accountSummaries,
}));

vi.mock("../store/categories/categories-api", () => ({
  useGetCategoriesQuery: apiMocks.categories,
}));

vi.mock("../store/transactions/transactions-api", () => ({
  useGetTransactionsQuery: apiMocks.transactions,
  useGetTransactionsSummaryQuery: apiMocks.transactionSummary,
}));

describe("Dashboard", () => {
  beforeEach(() => {
    apiMocks.dispatch.mockReset();
    apiMocks.accounts.mockReturnValue({
      currentData: [
        { id: 1, name: "Visible USD", isEnabled: true, isFavourite: true, currency: "USD" },
        { id: 2, name: "Hidden USD", isEnabled: true, isFavourite: false, currency: "USD" },
      ],
      isLoading: false,
      isError: false,
    });
    apiMocks.accountSummaries.mockReturnValue({
      currentData: [{ id: 1, name: "Visible USD", isEnabled: true, isFavourite: true, currency: "USD", value: 1250 }],
      isLoading: false,
      isError: false,
    });
    apiMocks.categories.mockReturnValue({ currentData: [], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [], metadata: { totalItems: 0 } }, isLoading: false, isError: false });
    apiMocks.transactionSummary.mockReturnValue({
      currentData: {
        baseCurrency: "USD",
        currentScope: {
          totalCount: 2,
          cashFlowBuckets: [{ date: "2026-09-01", currency: "USD", income: 2000, expense: -750, recordCount: 2 }],
        },
      },
      isLoading: false,
      isError: false,
    });
  });

  it("scopes every Dashboard read to the selected linked user and only includes overview-visible accounts", () => {
    render(<Dashboard />);

    expect(apiMocks.accounts).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
    expect(apiMocks.accountSummaries).toHaveBeenCalledWith({ ids: [1], linkedUserId: 2 }, { skip: false });
    expect(apiMocks.categories).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
    expect(apiMocks.transactionSummary).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId: 2,
      filter: expect.objectContaining({ accountIds: [1] }),
    }), { skip: false });
    expect(apiMocks.transactions).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId: 2,
      page: 0,
      pageSize: 0,
      filter: expect.objectContaining({ accountIds: [1] }),
    }), { skip: false });

    expect(screen.getByText("Visible USD")).toBeInTheDocument();
    expect(screen.queryByText("Hidden USD")).not.toBeInTheDocument();
    expect(screen.getByText("linkedAccount.readOnly:Linked QA")).toBeInTheDocument();
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/net worth/i)).not.toBeInTheDocument();
  });

  it("renders four panels in the mobile reading order and combines balance with accounts", () => {
    const { container } = render(<Dashboard />);

    const panels = Array.from(container.querySelectorAll<HTMLElement>(".dashboard-panel"));
    expect(panels).toHaveLength(4);
    expect(panels.map((panel) => panel.dataset.qa)).toEqual([
      "dashboard-position",
      "dashboard-cash-flow",
      "dashboard-expense-categories",
      "dashboard-income-categories",
    ]);

    const positionPanel = container.querySelector<HTMLElement>('[data-qa="dashboard-position"]');
    expect(positionPanel).not.toBeNull();
    expect(positionPanel?.querySelector('[data-qa="dashboard-balance"]')).not.toBeNull();
    expect(positionPanel?.querySelector('[data-qa="dashboard-accounts"]')).not.toBeNull();
    expect(positionPanel).toHaveTextContent("Visible USD");
  });

  it("uses distinct varied palettes for income and expense composition", () => {
    expect(new Set(DASHBOARD_EXPENSE_COLORS).size).toBe(DASHBOARD_EXPENSE_COLORS.length);
    expect(new Set(DASHBOARD_INCOME_COLORS).size).toBe(DASHBOARD_INCOME_COLORS.length);
    expect(DASHBOARD_EXPENSE_COLORS.some((color) => ["#D97706", "#F59E0B"].includes(color))).toBe(true);
    expect(DASHBOARD_INCOME_COLORS.some((color) => ["#2478D0", "#6D5BD0"].includes(color))).toBe(true);
    expect(DASHBOARD_EXPENSE_COLORS.filter((color) => DASHBOARD_INCOME_COLORS.includes(color))).toEqual([]);
  });
});
