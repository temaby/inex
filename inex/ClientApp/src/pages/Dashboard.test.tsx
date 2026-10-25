import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRatesForRange } from "../store/rates/rates-action";
import type { ExchangeRateItem } from "../store/rates/rates-slice";
import Dashboard, { DASHBOARD_EXPENSE_COLORS, DASHBOARD_INCOME_COLORS } from "./Dashboard";

const apiMocks = vi.hoisted(() => ({
  accounts: vi.fn(),
  accountSummaries: vi.fn(),
  categories: vi.fn(),
  transactions: vi.fn(),
  transactionSummary: vi.fn(),
  dispatch: vi.fn(),
  navigate: vi.fn(),
}));

const linkedState = {
  auth: { user: { id: 1 } },
  linkedAccount: {
    selectedLinkedUserId: 2 as number | null,
    linkState: {
      linkedAccounts: [{ id: 2, username: "Linked QA", baseCurrency: "USD" }],
    },
  },
  rates: { items: [], cached: undefined, range: undefined as undefined | {
    items: ExchangeRateItem[]; requestKey: string; completedKey: string; loading: boolean; error: string | null;
  } },
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, options?: Record<string, unknown>) => options?.username
      ? `${key}:${String(options.username)}`
      : options?.amount ? `${key}:${String(options.amount)}` : key,
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => apiMocks.navigate,
}));

vi.mock("../layouts/BasicPage", () => ({
  default: ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) => (
    <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>
  ),
}));

vi.mock("../components/primitives", () => ({
  InExButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} type="button">{children}</button>
  ),
  Num: ({ accessibleLabel, currency, kind, locale, signage, value, dataQa }: {
    accessibleLabel?: string;
    currency: string;
    kind: string;
    locale?: string;
    signage?: string;
    value: number;
    dataQa?: string;
  }) => (
    <span
      data-accessible-label={accessibleLabel}
      data-kind={kind}
      data-locale={locale}
      data-signage={signage}
      data-qa={dataQa}
    >
      {currency} {value}
    </span>
  ),
  SegmentedControl: ({ options, onChange }: { options: { key: string; label: string }[]; onChange: (key: string) => void }) => (
    <div>{options.map(option => <button key={option.key} onClick={() => onChange(option.key)}>{option.label}</button>)}</div>
  ),
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
  fetchRatesForRange: vi.fn(),
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
    localStorage.clear();
    apiMocks.dispatch.mockReset();
    apiMocks.navigate.mockReset();
    vi.mocked(fetchRatesForRange).mockClear();
    linkedState.rates.range = undefined;
    linkedState.linkedAccount.selectedLinkedUserId = 2;
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

  it("automatically requests own rates when opening with foreign account balances", () => {
    linkedState.linkedAccount.selectedLinkedUserId = null;
    apiMocks.accountSummaries.mockReturnValue({ currentData: [{ id: 1, name: "Euro", currency: "EUR", value: 10 }], isLoading: false, isError: false });
    render(<Dashboard />);
    expect(fetchRatesForRange).toHaveBeenCalledWith(expect.any(String), expect.any(String), null);
  });

  it("automatically loads foreign rates after cache completion and again on remount, without render loops", () => {
    apiMocks.accountSummaries.mockReturnValue({ currentData: [{ id: 1, name: "Euro", currency: "EUR", value: 10 }], isLoading: false, isError: false });
    const first = render(<React.StrictMode><Dashboard /></React.StrictMode>);
    expect(fetchRatesForRange).toHaveBeenCalledTimes(1);
    const [start, end] = vi.mocked(fetchRatesForRange).mock.calls[0];
    expect(fetchRatesForRange).toHaveBeenCalledWith(start, end, 2);
    const key = `2:${start}:${end}`;
    linkedState.rates.range = { items: [], requestKey: key, completedKey: key, loading: false, error: null };
    first.rerender(<React.StrictMode><Dashboard /></React.StrictMode>);
    expect(fetchRatesForRange).toHaveBeenCalledTimes(1);
    first.unmount();
    render(<Dashboard />);
    expect(fetchRatesForRange).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getAllByRole("button", { name: "dashboard.unavailable.retry" })[0]);
    expect(fetchRatesForRange).toHaveBeenCalledTimes(3);
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

  it("keeps compact account limits while pinning negative balances to explicit sign and color semantics", () => {
    const accounts = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      name: `Account ${index + 1}`,
      isEnabled: true,
      isFavourite: true,
      currency: "USD",
    }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({
      currentData: accounts.map((account, index) => ({
        ...account,
        value: index === 5 ? -10000 : (index + 1) * 100,
      })),
      isLoading: false,
      isError: false,
    });

    const { container } = render(<Dashboard />);
    const rows = Array.from(container.querySelectorAll<HTMLElement>(".dashboard-account-list__item"));
    const aggregate = container.querySelector<HTMLElement>(".dashboard-balance-total [data-kind]");

    expect(rows).toHaveLength(7);
    expect(rows[5]).not.toHaveClass("dashboard-account-list__item--mobile-collapsible");
    expect(rows[5]).not.toHaveClass("dashboard-account-list__item--desktop-collapsible");
    expect(rows[6]).toHaveClass("dashboard-account-list__item--desktop-collapsible");
    expect(rows[5].querySelector("[data-signage]"))
      .toHaveAttribute("data-signage", "negative-only");
    expect(rows[5].querySelector("[data-kind]"))
      .toHaveAttribute("data-kind", "expense");
    expect(rows[5].querySelector("[data-accessible-label]"))
      .toHaveAttribute("data-accessible-label", "dashboard.balance.amountLabel");
    expect(rows[0].querySelector("[data-kind]"))
      .toHaveAttribute("data-kind", "neutral");
    expect(rows[0].querySelector("[data-locale]"))
      .toHaveAttribute("data-locale", "en");
    expect(aggregate).toHaveAttribute("data-kind", "expense");
    expect(aggregate).toHaveAttribute("data-signage", "negative-only");
    expect(aggregate).toHaveAttribute("data-accessible-label", "dashboard.balance.amountLabel");

    const accountList = container.querySelector<HTMLElement>(".dashboard-account-list");
    const toggle = container.querySelector<HTMLButtonElement>(".dashboard-account-list__toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", accountList?.id);
    fireEvent.click(toggle!);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".dashboard-account-list"))
      .toHaveClass("dashboard-account-list--expanded");
  });

  it("renders concise top-card headers and places cash-flow totals before the chart", () => {
    const { container } = render(<Dashboard />);
    const position = container.querySelector<HTMLElement>('[data-qa="dashboard-position"]');
    const cashFlow = container.querySelector<HTMLElement>('[data-qa="dashboard-cash-flow"]');
    const summary = cashFlow?.querySelector(".dashboard-cash-flow-summary");
    const chart = cashFlow?.querySelector(".dashboard-cash-flow-chart");

    expect(position?.querySelectorAll(".dashboard-panel__eyebrow")).toHaveLength(0);
    expect(cashFlow?.querySelectorAll(".dashboard-panel__eyebrow")).toHaveLength(0);
    expect(position?.querySelector(".dashboard-panel__header svg")).toBeNull();
    expect(cashFlow?.querySelector(".dashboard-panel__header svg")).toBeNull();
    expect(summary?.compareDocumentPosition(chart!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("switches the mounted route immediately and preserves classic as the default", () => {
    const { container } = render(<Dashboard />);
    expect(container.querySelector(".dashboard-grid")).toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-dashboard"]')).not.toBeInTheDocument();
    act(() => {
      localStorage.setItem("inex.dashboard.variant.user-1", "visual");
      window.dispatchEvent(new StorageEvent("storage", { key: "inex.dashboard.variant.user-1" }));
    });
    expect(container.querySelector('[data-qa="visual-dashboard"]')).toBeInTheDocument();
    expect(container.querySelector(".dashboard-grid")).not.toBeInTheDocument();
    act(() => {
      localStorage.setItem("inex.dashboard.variant.user-1", "classic");
      window.dispatchEvent(new StorageEvent("storage", { key: "inex.dashboard.variant.user-1" }));
    });
    expect(container.querySelector(".dashboard-grid")).toBeInTheDocument();
  });

  it.each([
    [2000, -750, "resultPositive", "$1,250.00", "100%", "37.5%"],
    [500, -750, "resultNegative", "$250.00", "66.66666666666666%", "100%"],
    [750, -750, "resultEqual", "$0.00", "100%", "100%"],
    [0, 0, "resultNoActivity", "$0.00", "0%", "0%"],
    [0.3, -0.1 - 0.2, "resultEqual", "$0.00", "99.99999999999997%", "100%"],
    [1.005, -1.004, "resultPositive", "$0.01", "100%", "99.90049751243782%"],
  ])("renders common-scale flow and result for income %s / expenses %s", (income, expense, result, delta, incomeWidth, expenseWidth) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const summary = apiMocks.transactionSummary().currentData;
    apiMocks.transactionSummary.mockReturnValue({
      currentData: { ...summary, currentScope: { ...summary.currentScope, cashFlowBuckets: [{ currency: "USD", date: "2026-09-01", income, expense }] } },
      isLoading: false, isError: false,
    });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 1250");
    expect(container.querySelector('[data-qa="visual-flow-result"]')).toHaveTextContent(`dashboard.visual.${result}:${delta}`);
    const flow = container.querySelector('[data-qa="visual-flow"]')!;
    expect(flow.querySelector('[data-flow="income"]')).toHaveTextContent(`USD ${income}`);
    expect(flow.querySelector('[data-flow="expense"]')).toHaveTextContent(`USD ${expense}`);
    // Browser serialization may round fractional percentages; compare numerically.
    const widths = [...flow.querySelectorAll<HTMLElement>('[data-qa="visual-flow-bar"]')].map(el => parseFloat(el.style.width));
    expect(widths[0]).toBeCloseTo(parseFloat(incomeWidth));
    expect(widths[1]).toBeCloseTo(parseFloat(expenseWidth));
    expect(container.querySelectorAll(".visual-dashboard-card")).toHaveLength(3);
    expect(screen.queryByText("dashboard.categories.incomeTitle")).not.toBeInTheDocument();
  });

  it("renders one expense category, highlights it and opens the existing scoped transaction link", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 10, name: "Food", parentId: null }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [{ categoryId: 10, accountCurrency: "USD", amount: -750, created: "2026-09-01" }] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-expense-total"]')).toHaveTextContent("USD 750");
    const category = container.querySelector<HTMLButtonElement>('[data-category-key="10"]')!;
    expect(category).toHaveTextContent("100%");
    fireEvent.focus(category);
    expect(category).toHaveClass("is-highlighted");
    fireEvent.click(category);
    expect(apiMocks.navigate).toHaveBeenCalledWith(expect.stringMatching(/accountIds:1;categoryIds:10;.*type:expense;/));
  });

  it("drills into parent categories, returns with Escape, and supports child mode", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 10, name: "Food", parentId: null }, { id: 11, name: "Groceries", parentId: 10 }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [{ categoryId: 11, accountCurrency: "USD", amount: -750, created: "2026-09-01" }] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    fireEvent.click(container.querySelector('[data-category-key="10"]')!);
    expect(container.querySelector('[data-category-key="11"]')).toHaveTextContent("Groceries");
    expect(screen.getByRole("heading", { name: "dashboard.visual.expensesTitle" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("heading", { name: "dashboard.visual.expensesTitle" }), { key: "Escape" });
    expect(container.querySelector('[data-category-key="10"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "dashboard.categories.child" }));
    expect(container.querySelector('[data-category-key="11"]')).toHaveTextContent("Food / Groceries");
  });

  it("keeps empty categories gentle and limits native wallet rows to three", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Wallet ${index}`, currency: "USD", isEnabled: true, isFavourite: true, value: 100 }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(screen.getByText("dashboard.categories.expenseEmpty")).toBeInTheDocument();
    expect(container.querySelectorAll(".visual-dashboard-wallets li")).toHaveLength(3);
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 500");
    expect(screen.getByText("dashboard.visual.allAccounts")).toBeInTheDocument();
  });

  it("uses converted wallet proportions while retaining each wallet's original currency", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = [
      { id: 1, name: "Dollar", currency: "USD", isEnabled: true, isFavourite: true, value: 100 },
      { id: 2, name: "Zloty", currency: "PLN", isEnabled: true, isFavourite: true, value: 400 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const range = new Date();
    const prefix = `${range.getFullYear()}-${String(range.getMonth() + 1).padStart(2, "0")}`;
    const lastDay = new Date(range.getFullYear(), range.getMonth() + 1, 0).getDate();
    const key = `2:${prefix}-01:${prefix}-${lastDay}`;
    linkedState.rates.range = { items: [{ id: 1, currencyFrom: "USD", currencyTo: "PLN", rate: 4, date: `${prefix}-01`, isTemporary: false }], requestKey: key, completedKey: key, loading: false, error: null };
    const { container } = render(<Dashboard />);
    const bar = container.querySelector('[data-qa="visual-account-bar"]')!;
    expect([...bar.querySelectorAll<HTMLElement>("span")].map(el => el.style.width)).toEqual(["50%", "50%"]);
    expect(within(container.querySelector('[data-qa="visual-money"]') as HTMLElement).getByText("PLN 400")).toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 200");
  });

  it.each([[-100, "negativeBalancesHint"], [0, "zeroBalancesHint"]])("does not draw misleading wallet shares for %s", (value, hint) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const account = { id: 1, name: "Visible USD", currency: "USD", value };
    apiMocks.accountSummaries.mockReturnValue({ currentData: [account], isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-bar"]')).not.toBeInTheDocument();
    expect(screen.getByText(`dashboard.visual.${hint}`)).toBeInTheDocument();
  });

  it.each([
    { isLoading: true, isFetching: true, isError: false },
    { isLoading: false, isFetching: true, isError: false },
    { isLoading: false, isFetching: false, isError: true },
  ])("does not present zeros while account scope is unknown: %j", (status) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.accounts.mockReturnValue({ currentData: undefined, ...status });
    apiMocks.transactionSummary.mockReturnValue({ currentData: undefined, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-flow-result"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-flow="income"]')).not.toBeInTheDocument();
    expect(screen.queryByText("dashboard.categories.expenseEmpty")).not.toBeInTheDocument();
    if (status.isError) expect(screen.getByText("dashboard.cashFlow.error")).toBeInTheDocument();
  });

  it("prevents empty overview flow links from navigating to unrestricted transactions", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.accounts.mockReturnValue({ currentData: [], isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: [], isLoading: false, isError: false });
    apiMocks.transactionSummary.mockReturnValue({ currentData: undefined, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const income = container.querySelector<HTMLButtonElement>('[data-flow="income"]')!;
    const expense = container.querySelector<HTMLButtonElement>('[data-flow="expense"]')!;
    expect(income).toBeDisabled();
    expect(expense).toBeDisabled();
    fireEvent.click(income);
    fireEvent.click(expense);
    expect(apiMocks.navigate).not.toHaveBeenCalled();
  });

  it("keeps a balance scope transition pending until current summaries arrive", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.accountSummaries.mockReturnValue({ currentData: undefined, isLoading: false, isFetching: true, isError: false });
    const { container } = render(<Dashboard />);
    const moneyCard = container.querySelector('[data-qa="visual-money"]') as HTMLElement;
    expect(within(moneyCard).queryByText("dashboard.balance.error")).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-balance-total"]')).not.toBeInTheDocument();
    expect(moneyCard.querySelector(".visual-dashboard-state--loading")).toBeInTheDocument();
  });

  it("links a negative wallet warning to full details when that wallet is outside the preview", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Wallet ${index}`, currency: "USD", isEnabled: true, isFavourite: true, value: index === 3 ? -50 : 100 }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const warning = container.querySelector(".visual-dashboard-hint") as HTMLElement;
    expect(warning).toHaveTextContent("dashboard.visual.negativeBalancesHint");
    expect(within(warning).getByRole("link")).toHaveAttribute("href", "/accounts");
    expect(container.querySelectorAll(".visual-dashboard-wallets li")).toHaveLength(3);
  });
});
