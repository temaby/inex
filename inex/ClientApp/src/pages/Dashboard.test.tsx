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
    t: (key: string, options?: Record<string, unknown>) => options?.account
      ? `${key}:${String(options.account)};${String(options.original)};${String(options.converted)};${String(options.percentage)}`
      : options?.percentage ? `${key}:${String(options.percentage)}` : options?.username
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
        { id: 3, name: "Closed USD", isEnabled: false, isFavourite: true, currency: "USD" },
      ],
      isLoading: false,
      isError: false,
    });
    apiMocks.accountSummaries.mockReturnValue({
      currentData: [
        { id: 1, name: "Visible USD", isEnabled: true, isFavourite: true, currency: "USD", value: 1250 },
        { id: 2, name: "Hidden USD", isEnabled: true, isFavourite: false, currency: "USD", value: 0 },
      ],
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

  it("scopes reports to all active accounts and wallet balances to favorite accounts for the linked user", () => {
    render(<Dashboard />);

    expect(apiMocks.accounts).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
    expect(apiMocks.accountSummaries).toHaveBeenCalledWith({ ids: [1], linkedUserId: 2 }, { skip: false });
    expect(apiMocks.categories).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
    expect(apiMocks.transactionSummary).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId: 2,
      filter: expect.objectContaining({ accountIds: [1, 2] }),
    }), { skip: false });
    expect(apiMocks.transactions).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId: 2,
      page: 0,
      pageSize: 0,
      filter: expect.objectContaining({ accountIds: [1, 2] }),
    }), { skip: false });

    expect(screen.getByText("Visible USD")).toBeInTheDocument();
    expect(screen.queryByText("Hidden USD")).not.toBeInTheDocument();
    expect(screen.getByText("linkedAccount.readOnly:Linked QA")).toBeInTheDocument();
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/net worth/i)).not.toBeInTheDocument();
  });

  it.each([
    { variant: "classic", linkedUserId: null }, { variant: "classic", linkedUserId: 2 },
    { variant: "visual", linkedUserId: null }, { variant: "visual", linkedUserId: 2 },
  ])("keeps reports and drill-down usable without favorite wallets: %j", ({ variant, linkedUserId }) => {
    localStorage.setItem("inex.dashboard.variant.user-1", variant);
    linkedState.linkedAccount.selectedLinkedUserId = linkedUserId;
    apiMocks.accounts.mockReturnValue({ currentData: [
      { id: 1, name: "Not displayed USD", isEnabled: true, isFavourite: false, currency: "USD" },
      { id: 2, name: "Hidden USD", isEnabled: true, isFavourite: false, currency: "USD" },
      { id: 3, name: "Closed USD", isEnabled: false, isFavourite: true, currency: "USD" },
    ], isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: [
      { id: 1, name: "Not displayed USD", currency: "USD", value: 1000 },
      { id: 2, name: "Hidden USD", currency: "USD", value: 200 },
    ], isLoading: false, isError: false });
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 10, name: "Food", parentId: null }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { accountId: 2, categoryId: 10, accountCurrency: "USD", amount: -750, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(apiMocks.accountSummaries).toHaveBeenCalledWith({ ids: variant === "visual" ? [1, 2] : [], linkedUserId }, { skip: variant !== "visual" });
    expect(apiMocks.transactionSummary).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId, filter: expect.objectContaining({ accountIds: [1, 2] }),
    }), { skip: false });
    expect(apiMocks.transactions).toHaveBeenCalledWith(expect.objectContaining({
      linkedUserId, filter: expect.objectContaining({ accountIds: [1, 2] }),
    }), { skip: false });
    expect(screen.getAllByText(variant === "visual" ? "dashboard.visual.favoritesEmpty" : "dashboard.balance.empty").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-qa="visual-favorite-accounts"]')).not.toBeInTheDocument();
    if (variant === "visual") {
      expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 1200");
      expect(container.querySelectorAll('[data-qa="visual-account-bar"] button')).toHaveLength(2);
    } else {
      expect(screen.queryByText("Not displayed USD")).not.toBeInTheDocument();
      expect(screen.queryByText("Hidden USD")).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Closed USD")).not.toBeInTheDocument();
    const expense = container.querySelector<HTMLElement>(variant === "visual"
      ? '[data-qa="visual-expenses"]' : '[data-qa="dashboard-expense-categories"]')!;
    expect(expense).toHaveTextContent(variant === "visual" ? "USD 750" : "USD -750");
    fireEvent.click(within(expense).getByRole("button", { name: /Food|selectCategory/ }));
    expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:10;.*type:expense;/));
    const flowButton = container.querySelector<HTMLButtonElement>(variant === "visual"
      ? '[data-flow="expense"]' : '.dashboard-cash-flow-summary button:last-child')!;
    expect(flowButton).toBeEnabled();
    expect(flowButton).toHaveTextContent("USD -750");
    fireEvent.click(flowButton);
    expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;.*type:expense;/));
  });

  it("requests dated rates for report activity on a non-favorite account even when favorite balances need no conversion", () => {
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { accountId: 2, categoryId: 10, accountCurrency: "EUR", amount: -100, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    render(<Dashboard />);
    expect(fetchRatesForRange).toHaveBeenCalledWith(expect.any(String), expect.any(String), 2);
    expect(apiMocks.accountSummaries).toHaveBeenCalledWith({ ids: [1], linkedUserId: 2 }, { skip: false });
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

  it("removes repeated visual subtitles and uses accessible category and account wording", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const { container } = render(<Dashboard />);
    expect(screen.queryByText("dashboard.subtitle")).not.toBeInTheDocument();
    expect(screen.queryByText("dashboard.categories.level")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dashboard.visual.mainCategories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dashboard.visual.subcategories" })).toBeInTheDocument();
    expect(screen.getByText("dashboard.visual.moneyHint")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "dashboard.visual.flowTitle" })).toBeInTheDocument();
    for (const key of ["expenseHint", "incomeHint", "flowHint"]) {
      expect(screen.queryByText(`dashboard.visual.${key}`)).not.toBeInTheDocument();
    }
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveAttribute("data-accessible-label", "dashboard.visual.totalBalance");
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
    expect(container.querySelectorAll(".visual-dashboard-card")).toHaveLength(4);
    expect(screen.queryByText("dashboard.categories.incomeTitle")).not.toBeInTheDocument();
  });

  it.each([0, 1, 2, 4, 5, 10])("adapts visual income to %s categories without losing amounts", (count) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const categories = Array.from({ length: count }, (_, index) => ({ id: 200 + index, name: `Income ${index}`, parentId: null }));
    apiMocks.categories.mockReturnValue({ currentData: categories, isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: categories.map((category, index) => ({
      categoryId: category.id, accountCurrency: "USD", amount: (count - index) * 100, created: "2026-09-01",
    })) }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const income = container.querySelector<HTMLElement>('[data-qa="visual-income"]')!;
    expect(income.querySelector('[data-qa="visual-income-chart"]') !== null).toBe(count > 1);
    expect(income.querySelectorAll('[data-income-key]')).toHaveLength(Math.min(count, 5));
    if (count === 0) {
      expect(income).toHaveTextContent("dashboard.visual.incomeEmpty");
    } else {
      expect(income.querySelector('[data-qa="visual-income-total"]')).toHaveTextContent(`USD ${count * (count + 1) * 50}`);
      const first = income.querySelector('[data-income-key="200"]')!;
      fireEvent.focus(first);
      expect(first).toHaveClass("is-highlighted");
      fireEvent.click(first);
      expect(apiMocks.navigate).toHaveBeenCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:200;.*type:income;/));
    }
    if (count > 4) {
      const other = income.querySelector('[data-income-key="other"]')!;
      expect(other).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(other);
      expect(other).toHaveAttribute("aria-expanded", "true");
      const members = income.querySelectorAll('.visual-dashboard-legend__members button');
      expect(members).toHaveLength(count - 4);
      expect(members[0]).toHaveTextContent("Income 4");
      expect(members[0]).toHaveTextContent(`USD ${(count - 4) * 100}`);
      fireEvent.click(members[0]);
      expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:204;.*type:income;/));
    }
  });

  it("inspects income with pointer precedence, restores focused details and then restores the total", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 200, name: "Salary", parentId: null }, { id: 210, name: "Bonus", parentId: null },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 750, created: "2026-09-01" },
      { categoryId: 210, accountCurrency: "USD", amount: 250, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const center = container.querySelector('[data-qa="visual-income-center"]')!;
    const salary = container.querySelector('[data-income-key="200"]')!;
    const bonus = container.querySelector('[data-income-key="210"]')!;
    expect(center).toHaveTextContent("dashboard.visual.incomeTotal");
    expect(center).toHaveTextContent("USD 1000");
    fireEvent.mouseEnter(salary);
    expect(center).toHaveTextContent("Salary");
    expect(center).toHaveTextContent("USD 750");
    expect(center).toHaveTextContent("75%");
    fireEvent.mouseLeave(salary);
    expect(center).toHaveTextContent("dashboard.visual.incomeTotal");
    fireEvent.focus(salary);
    fireEvent.mouseEnter(bonus);
    expect(center).toHaveTextContent("Bonus");
    expect(center).toHaveTextContent("USD 250");
    expect(center).toHaveTextContent("25%");
    expect(bonus).toHaveClass("is-highlighted");
    fireEvent.mouseLeave(bonus);
    expect(center).toHaveTextContent("Salary");
    expect(salary).toHaveClass("is-highlighted");
    fireEvent.blur(salary);
    expect(center).toHaveTextContent("USD 1000");
    expect(container.querySelector('[data-qa="visual-income-share"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("inspects expanded Other income members and preserves their scoped navigation", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const categories = Array.from({ length: 6 }, (_, index) => ({ id: 200 + index, name: `Income ${index}`, parentId: null }));
    apiMocks.categories.mockReturnValue({ currentData: categories, isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: categories.map((category, index) => ({
      categoryId: category.id, accountCurrency: "USD", amount: (6 - index) * 100, created: "2026-09-01",
    })) }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const other = container.querySelector('[data-income-key="other"]')!;
    const center = container.querySelector('[data-qa="visual-income-center"]')!;
    fireEvent.click(other);
    const members = container.querySelectorAll('[data-income-member-key]');
    expect(members).toHaveLength(2);
    fireEvent.focus(members[0]);
    expect(center).toHaveTextContent("Income 4");
    expect(center).toHaveTextContent("USD 200");
    expect(center).toHaveTextContent("9.5%");
    expect(other).toHaveClass("is-highlighted");
    fireEvent.mouseEnter(members[1]);
    expect(center).toHaveTextContent("Income 5");
    expect(center).toHaveTextContent("USD 100");
    expect(center).toHaveTextContent("4.8%");
    fireEvent.mouseLeave(members[1]);
    expect(center).toHaveTextContent("Income 4");
    fireEvent.blur(members[0]);
    expect(center).toHaveTextContent("dashboard.visual.incomeTotal");
    fireEvent.click(members[0]);
    expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:204;.*type:income;/));
  });

  it("preserves tiny income share formatting and clears inspected details after data changes", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 200, name: "Salary", parentId: null }, { id: 210, name: "Interest", parentId: null },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 1000, created: "2026-09-01" },
      { categoryId: 210, accountCurrency: "USD", amount: 0.01, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container, rerender } = render(<Dashboard />);
    fireEvent.focus(container.querySelector('[data-income-key="210"]')!);
    const center = container.querySelector('[data-qa="visual-income-center"]')!;
    expect(center).toHaveTextContent("Interest");
    expect(center).toHaveTextContent("USD 0.01");
    expect(center).toHaveTextContent("dashboard.visual.smallShare:0.1%");
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 500, created: "2026-09-01" },
      { categoryId: 210, accountCurrency: "USD", amount: 50, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    rerender(<Dashboard />);
    expect(center).toHaveTextContent("dashboard.visual.incomeTotal");
    expect(center).toHaveTextContent("USD 550");
  });

  it("keeps the single income summary ringless when its legend receives focus", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 200, name: "Salary", parentId: null }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 500, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    fireEvent.focus(container.querySelector('[data-income-key="200"]')!);
    expect(container.querySelector('[data-qa="visual-income-center"]')).toHaveTextContent("dashboard.visual.incomeTotal");
    expect(container.querySelector('[data-qa="visual-income-total"]')).toHaveTextContent("USD 500");
    expect(container.querySelector('[data-qa="visual-income-chart"]')).toBeNull();
    expect(container.querySelector('[data-qa="visual-income-share"]')).toBeNull();
  });

  it("defaults a single income parent to children and restores focus after an explicit drill-down", async () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 200, name: "Work", parentId: null },
      { id: 201, name: "Salary", parentId: 200 },
      { id: 202, name: "Bonus", parentId: 200 },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 10, created: "2026-09-01" },
      { categoryId: 201, accountCurrency: "USD", amount: 800, created: "2026-09-01" },
      { categoryId: 202, accountCurrency: "USD", amount: 200, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const income = container.querySelector<HTMLElement>('[data-qa="visual-income"]')!;
    expect(income.querySelector('[data-qa="visual-income-chart"]')).toBeInTheDocument();
    expect(income.querySelectorAll('[data-income-key]')).toHaveLength(3);
    expect(income.querySelector('[data-qa="visual-income-context"]')).toBeNull();
    expect(income).toHaveTextContent("dashboard.visual.incomeTotal");
    expect(screen.getByRole("heading", { name: "dashboard.visual.incomeTitle" })).not.toHaveFocus();
    fireEvent.click(within(income).getByRole("button", { name: "dashboard.visual.backToCategories" }));
    expect(income.querySelector('[data-qa="visual-income-chart"]')).toBeNull();
    expect(income).toHaveTextContent("dashboard.visual.viewBreakdown");
    fireEvent.click(income.querySelector('[data-income-key="200"]')!);
    expect(income.querySelector('[data-qa="visual-income-chart"]')).toBeInTheDocument();
    expect(income.querySelectorAll('[data-income-key]')).toHaveLength(3);
    expect(income.querySelector('[data-qa="visual-income-total"]')).toHaveTextContent("USD 1010");
    expect(income.querySelector('[data-qa="visual-income-context"]')).toHaveTextContent("Work");
    expect(screen.getByRole("heading", { name: "dashboard.visual.incomeTitle" })).toHaveFocus();
    fireEvent.click(income.querySelector('[data-income-key="202"]')!);
    expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:202;.*type:income;/));
    fireEvent.keyDown(income, { key: "Escape" });
    await act(async () => { await new Promise((resolve) => window.requestAnimationFrame(resolve)); });
    expect(income.querySelector('[data-income-key="200"]')).toHaveFocus();
    expect(income.querySelector('[data-qa="visual-income-chart"]')).toBeNull();
  });

  it("applies the default independently after data loads and preserves explicit parent selection until workspace changes", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 10, name: "Food", parentId: null }, { id: 11, name: "Groceries", parentId: 10 },
      { id: 20, name: "Home", parentId: null }, { id: 21, name: "Rent", parentId: 20 },
      { id: 200, name: "Work", parentId: null }, { id: 201, name: "Salary", parentId: 200 },
      { id: 202, name: "Bonus", parentId: 200 },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ isLoading: true, isError: false });
    const { container, rerender } = render(<Dashboard />);
    expect(container.querySelector('[data-income-key]')).toBeNull();
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 11, accountCurrency: "USD", amount: -50, created: "2026-09-01" },
      { categoryId: 21, accountCurrency: "USD", amount: -100, created: "2026-09-01" },
      { categoryId: 201, accountCurrency: "USD", amount: 500, created: "2026-09-01" },
      { categoryId: 202, accountCurrency: "USD", amount: 200, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    rerender(<Dashboard />);
    expect(container.querySelector('[data-category-key="10"]')).toHaveTextContent("Food");
    expect(container.querySelector('[data-category-key="20"]')).toHaveTextContent("Home");
    expect(container.querySelector('[data-income-key="201"]')).toHaveTextContent("Salary");
    expect(container.querySelector('[data-income-key="202"]')).toHaveTextContent("Bonus");
    expect(screen.getByRole("heading", { name: "dashboard.visual.incomeTitle" })).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "dashboard.visual.backToCategories" }));
    rerender(<Dashboard />);
    expect(container.querySelector('[data-income-key="200"]')).toHaveTextContent("Work");
    expect(container.querySelector('[data-income-key="201"]')).toBeNull();
    linkedState.linkedAccount.selectedLinkedUserId = null;
    rerender(<Dashboard />);
    expect(container.querySelector('[data-income-key="201"]')).toHaveTextContent("Salary");
  });

  it("keeps income gross flows and hierarchy separate from receiving wallets and system categories", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 200, name: "Work", parentId: null }, { id: 201, name: "Salary", parentId: 200 },
      { id: 300, name: "Transfers", parentId: null, isSystem: true },
      { id: 301, name: "Internal", parentId: 300 },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 201, accountCurrency: "USD", amount: 500, created: "2026-09-01" },
      { categoryId: 201, accountCurrency: "USD", amount: -40, created: "2026-09-01" },
      { categoryId: 301, accountCurrency: "USD", amount: 999, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const income = container.querySelector<HTMLElement>('[data-qa="visual-income"]')!;
    expect(income.querySelector('[data-qa="visual-income-total"]')).toHaveTextContent("USD 500");
    expect(income).not.toHaveTextContent("Transfers");
    expect(income).not.toHaveTextContent("Visible USD");
    fireEvent.click(screen.getByRole("button", { name: "dashboard.visual.subcategories" }));
    expect(income.querySelector('[data-income-key="201"]')).toHaveTextContent("Work / Salary");
  });

  it("withholds partial income when its dated currency conversion is missing", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 200, name: "Salary", parentId: null }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 200, accountCurrency: "USD", amount: 500, created: "2026-09-01" },
      { categoryId: 200, accountCurrency: "EUR", amount: 200, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container, rerender } = render(<Dashboard />);
    const [start, end] = vi.mocked(fetchRatesForRange).mock.calls[0];
    const key = `2:${start}:${end}`;
    linkedState.rates.range = { items: [], requestKey: key, completedKey: key, loading: false, error: null };
    rerender(<Dashboard />);
    const income = container.querySelector<HTMLElement>('[data-qa="visual-income"]')!;
    expect(income).toHaveTextContent("dashboard.unavailable.title");
    expect(income.querySelector('[data-qa="visual-income-total"]')).toBeNull();
    fireEvent.click(within(income).getByRole("button", { name: "dashboard.unavailable.retry" }));
    expect(fetchRatesForRange).toHaveBeenCalledTimes(2);
    linkedState.rates.range = {
      items: [{ id: 1, currencyFrom: "USD", currencyTo: "EUR", rate: 2, date: "2026-09-01", isTemporary: false }],
      requestKey: key, completedKey: key, loading: false, error: null,
    };
    rerender(<Dashboard />);
    expect(income.querySelector('[data-qa="visual-income-total"]')).toHaveTextContent("USD 600");
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
    expect(container.querySelector('[data-qa="visual-expense-center"]')).toHaveTextContent("Food");
    expect(container.querySelector('[data-qa="visual-expense-share"]')).toHaveTextContent("100%");
    fireEvent.click(category);
    expect(apiMocks.navigate).toHaveBeenCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:10;.*type:expense;/));
  });

  it("shows expense details on hover and focus, restores focused details after pointer exit, and resets to the total", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [
      { id: 10, name: "Food", parentId: null }, { id: 20, name: "Home", parentId: null },
    ], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [
      { categoryId: 10, accountCurrency: "USD", amount: -750, created: "2026-09-01" },
      { categoryId: 20, accountCurrency: "USD", amount: -250, created: "2026-09-01" },
    ] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const center = container.querySelector('[data-qa="visual-expense-center"]')!;
    const food = container.querySelector('[data-category-key="10"]')!;
    const home = container.querySelector('[data-category-key="20"]')!;
    expect(center).toHaveTextContent("dashboard.visual.expenseTotal");
    expect(center).toHaveTextContent("USD 1000");
    fireEvent.mouseEnter(food);
    expect(center).toHaveTextContent("Food");
    expect(center).toHaveTextContent("USD 750");
    expect(center).toHaveTextContent("75%");
    fireEvent.mouseLeave(food);
    expect(center).toHaveTextContent("dashboard.visual.expenseTotal");
    fireEvent.focus(food);
    fireEvent.mouseEnter(home);
    expect(center).toHaveTextContent("Home");
    expect(center).toHaveTextContent("USD 250");
    expect(home).toHaveClass("is-highlighted");
    fireEvent.mouseLeave(home);
    expect(center).toHaveTextContent("Food");
    expect(food).toHaveClass("is-highlighted");
    fireEvent.blur(food);
    expect(center).toHaveTextContent("dashboard.visual.expenseTotal");
    expect(center).toHaveTextContent("USD 1000");
    expect(container.querySelector('[data-qa="visual-expense-share"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("clears inspected expense details when displayed data changes", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 10, name: "Food", parentId: null }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [{ categoryId: 10, accountCurrency: "USD", amount: -750, created: "2026-09-01" }] }, isLoading: false, isError: false });
    const { container, rerender } = render(<Dashboard />);
    fireEvent.mouseEnter(container.querySelector('[data-category-key="10"]')!);
    expect(container.querySelector('[data-qa="visual-expense-center"]')).toHaveTextContent("Food");
    apiMocks.transactions.mockReturnValue({ currentData: { data: [{ categoryId: 10, accountCurrency: "USD", amount: -500, created: "2026-09-01" }] }, isLoading: false, isError: false });
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-expense-center"]')).toHaveTextContent("dashboard.visual.expenseTotal");
    expect(container.querySelector('[data-qa="visual-expense-total"]')).toHaveTextContent("USD 500");
  });

  it("inspects expanded Other expenses while highlighting the grouped segment and retaining member navigation", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const categories = Array.from({ length: 10 }, (_, index) => ({ id: 100 + index, name: `Expense ${index}`, parentId: null }));
    apiMocks.categories.mockReturnValue({ currentData: categories, isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: categories.map((category, index) => ({
      categoryId: category.id, accountCurrency: "USD", amount: -(10 - index) * 100, created: "2026-09-01",
    })) }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const center = container.querySelector('[data-qa="visual-expense-center"]')!;
    const other = container.querySelector('[data-category-key="other"]')!;
    fireEvent.click(other);
    const members = container.querySelectorAll('[data-category-member-key]');
    expect(members).toHaveLength(2);
    fireEvent.mouseEnter(members[0]);
    expect(center).toHaveTextContent("Expense 8");
    expect(center).toHaveTextContent("USD 200");
    expect(center).toHaveTextContent("4%");
    expect(other).toHaveClass("is-highlighted");
    fireEvent.mouseLeave(members[0]);
    expect(center).toHaveTextContent("dashboard.visual.expenseTotal");
    fireEvent.focus(members[0]);
    fireEvent.mouseEnter(members[1]);
    expect(center).toHaveTextContent("Expense 9");
    expect(center).toHaveTextContent("USD 100");
    expect(center).toHaveTextContent("2%");
    fireEvent.mouseLeave(members[1]);
    expect(center).toHaveTextContent("Expense 8");
    fireEvent.blur(members[0]);
    expect(center).toHaveTextContent("dashboard.visual.expenseTotal");
    fireEvent.click(members[0]);
    expect(apiMocks.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/accountIds:1,2;categoryIds:108;.*type:expense;/));
  });

  it("drills into parent categories, returns with Escape, and supports child mode", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    apiMocks.categories.mockReturnValue({ currentData: [{ id: 10, name: "Food", parentId: null }, { id: 11, name: "Groceries", parentId: 10 }], isLoading: false, isError: false });
    apiMocks.transactions.mockReturnValue({ currentData: { data: [{ categoryId: 11, accountCurrency: "USD", amount: -750, created: "2026-09-01" }] }, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('[data-category-key="11"]')).toHaveTextContent("Groceries");
    expect(screen.getByRole("heading", { name: "dashboard.visual.expensesTitle" })).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "dashboard.visual.backToCategories" }));
    fireEvent.click(container.querySelector('[data-category-key="10"]')!);
    expect(container.querySelector('[data-category-key="11"]')).toHaveTextContent("Groceries");
    expect(screen.getByRole("heading", { name: "dashboard.visual.expensesTitle" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("heading", { name: "dashboard.visual.expensesTitle" }), { key: "Escape" });
    expect(container.querySelector('[data-category-key="10"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "dashboard.visual.subcategories" }));
    expect(container.querySelector('[data-category-key="11"]')).toHaveTextContent("Food / Groceries");
  });

  it("keeps empty categories gentle and shows five native favorite rows", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Wallet ${index}`, currency: "USD", isEnabled: true, isFavourite: true, value: 100 }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect(screen.getByText("dashboard.visual.expenseEmpty")).toBeInTheDocument();
    expect(container.querySelectorAll(".visual-dashboard-wallets li")).toHaveLength(5);
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
    expect([...bar.querySelectorAll<HTMLElement>("button")].map(el => el.style.width)).toEqual(["50%", "50%"]);
    expect(within(container.querySelector('[data-qa="visual-money"]') as HTMLElement).getByText("PLN 400")).toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 200");
  });

  it.each([[-100, "negativeBalancesHint"], [0, "zeroBalancesHint"]])("does not draw misleading wallet shares for %s", (value, hint) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const account = { id: 1, name: "Visible USD", currency: "USD", value, isEnabled: true, isFavourite: true };
    apiMocks.accounts.mockReturnValue({ currentData: [account], isLoading: false, isError: false });
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
    expect(screen.queryByText("dashboard.visual.expenseEmpty")).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-income-total"]')).not.toBeInTheDocument();
    expect(screen.queryByText("dashboard.visual.incomeEmpty")).not.toBeInTheDocument();
    if (status.isError) expect(screen.getByText("dashboard.cashFlow.error")).toBeInTheDocument();
  });

  it("prevents flow links without active reporting accounts from navigating to unrestricted transactions", () => {
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

  it("keeps debt in the net total, excludes it from positive shares and links to all accounts", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Wallet ${index}`, currency: "USD", isEnabled: true, isFavourite: true, value: index === 3 ? -50 : 100 }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const warning = container.querySelector(".visual-dashboard-hint") as HTMLElement;
    expect(warning).toHaveTextContent("dashboard.visual.negativeBalancesHint");
    expect(within(warning).getByRole("link")).toHaveAttribute("href", "/accounts");
    expect(container.querySelectorAll(".visual-dashboard-wallets li")).toHaveLength(4);
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 250");
    expect(container.querySelectorAll('[data-qa="visual-account-bar"] button')).toHaveLength(3);
    expect(container.querySelector('[data-qa="visual-account-bar"] [data-account-id="4"]')).not.toBeInTheDocument();
  });

  it.each([0, 1, 4, 5, 8])("lists only up to five explicit eligible favorites when %s exist", (count) => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const favorites = Array.from({ length: count }, (_, index) => ({
      id: index + 1, name: `Favorite ${index + 1}`, currency: "USD", isEnabled: true, isFavourite: true, value: (index + 1) * 10,
    }));
    const accounts = [...favorites,
      { id: 100, name: "Large non-favorite", currency: "USD", isEnabled: true, isFavourite: false, value: 10000 },
      { id: 101, name: "Disabled favorite", currency: "USD", isEnabled: false, isFavourite: true, value: 20000 },
      { id: 102, name: "Implicit favorite", currency: "USD", isEnabled: true, value: 30000 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const rows = [...container.querySelectorAll<HTMLElement>('[data-qa="visual-favorite-accounts"] li')];
    expect(rows.map((row) => Number(row.dataset.accountId))).toEqual(favorites.map((account) => account.id).reverse().slice(0, 5));
    expect(rows).toHaveLength(Math.min(count, 5));
    const bar = container.querySelector('[data-qa="visual-account-bar"]')!;
    expect(bar.querySelectorAll("button")).toHaveLength(count + 2);
    expect(bar.querySelector('[data-account-id="101"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent(`USD ${40000 + count * (count + 1) * 5}`);
    expect(apiMocks.accountSummaries).toHaveBeenCalledWith({ ids: [...favorites.map((account) => account.id), 100, 102], linkedUserId: 2 }, { skip: false });
    if (count === 0) expect(container.querySelector('[data-qa="visual-favorites-empty"] a')).toHaveAttribute("href", "/accounts");
  });

  it("selects favorite and non-favorite segments without changing the list, and clears with a control or Escape", async () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1, name: `Wallet ${index + 1}`, currency: "USD", isEnabled: true, isFavourite: index < 6, value: (index + 1) * 100,
    }));
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const rows = () => [...container.querySelectorAll<HTMLElement>('[data-qa="visual-favorite-accounts"] li')].map((row) => row.dataset.accountId);
    const originalRows = rows();
    const segment = (id: number) => container.querySelector<HTMLButtonElement>(`[data-qa="visual-account-bar"] [data-account-id="${id}"]`)!;
    fireEvent.click(segment(6));
    expect(segment(6)).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("Wallet 6");
    expect(segment(6)).toHaveAttribute("aria-label", expect.stringMatching(/USD\s600\.00/));
    fireEvent.click(segment(7));
    fireEvent.blur(segment(7));
    expect(segment(6)).toHaveAttribute("aria-pressed", "false");
    const details = container.querySelector('[data-qa="visual-account-selection"]')!;
    expect(details).toHaveTextContent("Wallet 7");
    expect(details).toHaveTextContent("USD 700");
    expect(details).toHaveTextContent("dashboard.visual.convertedBalance:USD 700.00");
    expect(details).toHaveTextContent("dashboard.visual.positiveShare:25%");
    expect(details.querySelector<HTMLElement>(".visual-dashboard-swatch")?.style.background).toBe(segment(7).style.background);
    expect(rows()).toEqual(originalRows);
    const clear = container.querySelector<HTMLButtonElement>('[data-qa="visual-account-clear"]')!;
    act(() => clear.focus());
    fireEvent.click(clear);
    expect(container.querySelector('[data-qa="visual-account-selection"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-account-picker"]')).toHaveFocus();
    fireEvent.change(container.querySelector('[data-qa="visual-account-picker"]')!, { target: { value: "7" } });
    expect(segment(7)).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(segment(7), { key: "Escape" });
    expect(container.querySelector('[data-qa="visual-account-selection"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-account-picker"]')).toHaveFocus();
    fireEvent.focus(segment(7));
    const tooltip = await screen.findByText("Wallet 7", { selector: '[data-qa="visual-account-tooltip"] strong' });
    expect(tooltip.closest('[data-qa="visual-account-tooltip"]')).toHaveTextContent("USD 700");
  });

  it("keeps colors stable across sorting and shares them between favorite rows and selected details", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = [
      { id: 1, name: "One", currency: "USD", isEnabled: true, isFavourite: true, value: 100 },
      { id: 2, name: "Two", currency: "USD", isEnabled: true, isFavourite: true, value: 200 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container, rerender } = render(<Dashboard />);
    const segment = () => container.querySelector<HTMLButtonElement>('[data-qa="visual-account-bar"] [data-account-id="1"]')!;
    const color = segment().style.background;
    expect(container.querySelector<HTMLElement>('[data-qa="visual-favorite-accounts"] [data-account-id="1"] .visual-dashboard-swatch')?.style.background).toBe(color);
    fireEvent.click(segment());
    apiMocks.accountSummaries.mockReturnValue({ currentData: [{ ...accounts[1], value: 50 }, { ...accounts[0], value: 500 }], isLoading: false, isError: false });
    rerender(<Dashboard />);
    expect(segment().style.background).toBe(color);
    expect(segment()).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-qa="visual-favorite-accounts"] li')).toHaveAttribute("data-account-id", "1");
    expect(container.querySelector<HTMLElement>('[data-qa="visual-account-selection"] .visual-dashboard-swatch')?.style.background).toBe(color);
  });

  it("uses current favorite metadata and breaks equal-balance ties by ID", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = [
      { id: 3, name: "Three", currency: "USD", isEnabled: true, isFavourite: true, value: 100 },
      { id: 1, name: "One", currency: "USD", isEnabled: true, isFavourite: false, value: 1000 },
      { id: 2, name: "Two", currency: "USD", isEnabled: true, isFavourite: true, value: 100 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts.map((account) => ({ ...account, isFavourite: !account.isFavourite })), isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    expect([...container.querySelectorAll<HTMLElement>('[data-qa="visual-favorite-accounts"] li')].map((row) => row.dataset.accountId)).toEqual(["2", "3"]);
  });

  it("keeps tiny segments proportional and selectable through the account picker", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = [
      { id: 1, name: "Large", currency: "USD", isEnabled: true, isFavourite: true, value: 99999.99 },
      { id: 2, name: "Tiny", currency: "USD", isEnabled: true, isFavourite: false, value: 0.01 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container } = render(<Dashboard />);
    const segment = container.querySelector<HTMLButtonElement>('[data-qa="visual-account-bar"] [data-account-id="2"]')!;
    expect(parseFloat(segment.style.width)).toBeCloseTo(0.00001, 8);
    expect(segment).toHaveAttribute("aria-label", expect.stringContaining("<0.1%"));
    fireEvent.change(container.querySelector('[data-qa="visual-account-picker"]')!, { target: { value: "2" } });
    expect(segment).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("USD 0.01");
    expect(container.querySelector('[data-qa="visual-favorite-accounts"]')).not.toHaveTextContent("Tiny");
  });

  it("clears selected details after workspace changes or account removal", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const { container, rerender } = render(<Dashboard />);
    const select = () => fireEvent.click(container.querySelector('[data-qa="visual-account-bar"] [data-account-id="1"]')!);
    select();
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toBeInTheDocument();
    linkedState.linkedAccount.selectedLinkedUserId = null;
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-selection"]')).not.toBeInTheDocument();
    select();
    apiMocks.accounts.mockReturnValue({ currentData: [{ id: 2, name: "Hidden USD", currency: "USD", isEnabled: true, isFavourite: false }], isLoading: false, isError: false });
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-selection"]')).not.toBeInTheDocument();
  });

  it("preserves the selected account across a temporary balance refresh", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const ready = apiMocks.accountSummaries();
    const { container, rerender } = render(<Dashboard />);
    fireEvent.click(container.querySelector('[data-qa="visual-account-bar"] [data-account-id="1"]')!);
    apiMocks.accountSummaries.mockReturnValue({ currentData: undefined, isLoading: false, isFetching: true, isError: false });
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-selection"]')).not.toBeInTheDocument();
    apiMocks.accountSummaries.mockReturnValue(ready);
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-bar"] [data-account-id="1"]')).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("Visible USD");
  });

  it("ranks favorites by reporting-currency balances, sums positive shares independently from debt and preserves original amounts", () => {
    localStorage.setItem("inex.dashboard.variant.user-1", "visual");
    const accounts = [
      { id: 1, name: "USD", currency: "USD", isEnabled: true, isFavourite: true, value: 300 },
      { id: 2, name: "PLN", currency: "PLN", isEnabled: true, isFavourite: true, value: 800 },
      { id: 3, name: "Debt", currency: "PLN", isEnabled: true, isFavourite: true, value: -400 },
      { id: 4, name: "Other", currency: "USD", isEnabled: true, isFavourite: false, value: 500 },
      { id: 5, name: "Zero", currency: "EUR", isEnabled: true, isFavourite: true, value: 0 },
    ];
    apiMocks.accounts.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    apiMocks.accountSummaries.mockReturnValue({ currentData: accounts, isLoading: false, isError: false });
    const { container, rerender } = render(<Dashboard />);
    const [start, end] = vi.mocked(fetchRatesForRange).mock.calls[0];
    const key = `2:${start}:${end}`;
    // Native favorites remain visible while rates load, using stable ID order.
    expect([...container.querySelectorAll<HTMLElement>('[data-qa="visual-favorite-accounts"] li')].map((row) => row.dataset.accountId)).toEqual(["1", "2", "3", "5"]);
    linkedState.rates.range = { items: [], requestKey: key, completedKey: key, loading: false, error: null };
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-account-bar"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-qa="visual-favorite-accounts"]')).toHaveTextContent("PLN 800");
    linkedState.rates.range.items = [{ id: 1, currencyFrom: "USD", currencyTo: "PLN", rate: 4, date: start, isTemporary: false }];
    rerender(<Dashboard />);
    expect(container.querySelector('[data-qa="visual-balance-total"]')).toHaveTextContent("USD 900");
    const segments = [...container.querySelectorAll<HTMLButtonElement>('[data-qa="visual-account-bar"] button')];
    expect(segments.map((button) => button.style.width)).toEqual(["30%", "20%", "50%"]);
    expect([...container.querySelectorAll<HTMLElement>('[data-qa="visual-favorite-accounts"] li')].map((row) => row.dataset.accountId)).toEqual(["1", "2", "5", "3"]);
    fireEvent.click(segments[1]);
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("PLN 800");
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("dashboard.visual.convertedBalance:USD 200.00");
    expect(container.querySelector('[data-qa="visual-account-selection"]')).toHaveTextContent("dashboard.visual.positiveShare:20%");
    expect(container.querySelector('[data-qa="visual-favorite-accounts"] [data-account-id="3"] [data-kind]')).toHaveAttribute("data-kind", "expense");
  });
});
