import * as React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { InternalTransferRequestResponse } from "../../store/transactions/transactions-api";
import InternalTransferRequests from "./InternalTransferRequests";

const state = vi.hoisted(() => ({ requests: [] as InternalTransferRequestResponse[], pending: 1, dataPage: 1, totalItems: 1, loading: false, error: false, decide: vi.fn(), refetch: vi.fn(), dispatch: vi.fn(), refresh: vi.fn(), userId: 1 as number | undefined, query: vi.fn() }));
vi.mock("../../store/hooks", () => ({ useAppSelector: () => state.userId, useAppDispatch: () => state.dispatch }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../../store/transactions/transactions-api", () => ({
    refreshObservedInternalTransferPostings: (...args: unknown[]) => state.refresh(...args),
    useGetInternalTransferRequestsQuery: (...args: unknown[]) => { state.query(...args); return ({ currentData: { data: state.requests, totalItems: state.totalItems, totalPending: state.pending, page: state.dataPage, pageSize: 10 }, isLoading: state.loading, isError: state.error, refetch: state.refetch }); },
    useDecideInternalTransferMutation: () => [state.decide, { isLoading: false }],
}));
const request: InternalTransferRequestResponse = {
    id: 10, masterUserId: 2, linkedUserId: 1, masterUsername: "Master QA", linkedUsername: "Recipient QA", status: "Pending", masterValue: -20, currency: "USD", operationDate: "2026-10-01", comment: "Original comment",
    masterTransactionId: 100, linkedTransactionId: null, requestedAt: "2026-10-02", decidedAt: null, decidedBy: null, canAccept: true,
};
const account: AccountResponse = { id: 1, key: "usd", name: "Own USD", currency: "USD", currencyId: 1, isEnabled: true, isFavourite: true, description: null };
const accounts = [account, { ...account, id: 2, name: "Own EUR", currency: "EUR" }, { ...account, id: 3, name: "Disabled USD", isEnabled: false }];
beforeEach(() => { window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }); state.userId = 1; state.dataPage = 1; state.totalItems = 1; state.refresh.mockReset(); state.query.mockReset(); state.requests = [request]; state.pending = 1; state.error = false; state.loading = false; state.decide.mockReset(); state.decide.mockReturnValue({ unwrap: () => Promise.resolve({}) }); state.refetch.mockReset(); });
describe("InternalTransferRequests", () => {
    it("requires explicit same-currency active account choice and sends fixed acceptance only", async () => {
        const user = userEvent.setup(); render(<InternalTransferRequests accounts={accounts} />);
        expect(screen.getByText("Master QA")).toBeInTheDocument();
        expect(screen.getByText("transferRequests.creditConsent")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "transferRequests.accept" })).toBeDisabled();
        await user.click(screen.getByRole("combobox"));
        expect(screen.queryByText("Own EUR")).not.toBeInTheDocument(); expect(screen.queryByText("Disabled USD")).not.toBeInTheDocument();
        await user.click(screen.getByTitle("Own USD"));
        await user.click(screen.getByRole("button", { name: "transferRequests.accept" }));
        expect(state.decide).toHaveBeenCalledWith({ id: 10, decision: "accept", accountId: 1 });
    });
    it("keeps rejection available when no matching account exists", async () => {
        render(<InternalTransferRequests accounts={[]} />);
        expect(screen.getByText("transferRequests.noAccount")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "transferRequests.accept" })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "transferRequests.reject" }));
        expect(state.decide).toHaveBeenCalledWith({ id: 10, decision: "reject", accountId: undefined });
    });
    it("requires debit consent for a positive master operation", () => {
        state.requests = [{ ...request, masterValue: 20 }]; render(<InternalTransferRequests accounts={accounts} />);
        expect(screen.getByText("transferRequests.debitConsent")).toBeInTheDocument();
    });
    it("prevents acceptance on a revoked original link while allowing rejection", () => {
        state.requests = [{ ...request, canAccept: false }]; render(<InternalTransferRequests accounts={accounts} />);
        expect(screen.getByText("transferRequests.linkUnavailable")).toBeInTheDocument();
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "transferRequests.accept" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "transferRequests.reject" })).toBeEnabled();
    });
    it("shows only cancellation for a master and retains the recipient identity", () => {
        state.requests = [{ ...request, masterUserId: 1, linkedUserId: 2 }]; render(<InternalTransferRequests accounts={accounts} />);
        expect(screen.getByText("Recipient QA")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "transferRequests.accept" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "transferRequests.cancel" }));
        expect(state.decide).toHaveBeenCalledWith({ id: 10, decision: "cancel", accountId: undefined });
    });
    it("retains original terms and removes decision controls for resolved history", () => {
        state.requests = [{ ...request, status: "Accepted", decidedAt: "2026-10-03", decidedBy: 1 }]; render(<InternalTransferRequests accounts={accounts} />);
        expect(screen.getByText("Original comment")).toBeInTheDocument();
        expect(screen.getByText("transferRequests.originalTerms")).toBeInTheDocument();
        expect(within(screen.getByRole("article")).queryByRole("button")).not.toBeInTheDocument();
    });
    it("exposes empty and retryable error states", () => {
        state.requests = []; state.error = true; render(<InternalTransferRequests accounts={[]} />);
        expect(screen.getByText("transferRequests.empty")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "transferRequests.retry" })); expect(state.refetch).toHaveBeenCalledOnce();
    });
    it("shows a recoverable mutation error", async () => {
        state.decide.mockReturnValue({ unwrap: () => Promise.reject(new Error("Request changed")) });
        render(<InternalTransferRequests accounts={accounts} />);
        fireEvent.click(screen.getByRole("button", { name: "transferRequests.reject" }));
        expect(await screen.findByText("Request changed")).toBeInTheDocument();
    });
    it("refreshes ledger and dependent caches when polling observes external acceptance", () => {
        const view = render(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).not.toHaveBeenCalled();
        state.requests = [{ ...request, status: "Accepted" }];
        view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).toHaveBeenCalledExactlyOnceWith(state.dispatch);
        view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).toHaveBeenCalledOnce();
    });
    it("scopes query cache identity to the authenticated user and skips anonymous reads", () => {
        const view = render(<InternalTransferRequests accounts={accounts} />);
        expect(state.query).toHaveBeenLastCalledWith({ userId: 1, page: 1 }, expect.anything());
        state.userId = 2; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.query).toHaveBeenLastCalledWith({ userId: 2, page: 1 }, expect.anything());
        state.userId = undefined; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
        expect(state.query.mock.calls[state.query.mock.calls.length - 1]?.[0]).toEqual(Symbol.for("RTKQ/skipToken"));
    });

    it("resets pagination for every authenticated user switch", () => {
        state.totalItems = 20;
        const view = render(<InternalTransferRequests accounts={accounts} />);
        fireEvent.click(screen.getByTitle("Next Page"));
        expect(state.query).toHaveBeenLastCalledWith({ userId: 1, page: 2 }, expect.anything());
        state.userId = 2; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.query).toHaveBeenLastCalledWith({ userId: 2, page: 1 }, expect.anything());
        state.userId = 1; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.query).toHaveBeenLastCalledWith({ userId: 1, page: 1 }, expect.anything());
    });

    it.each([10, 11])("refreshes financial caches once when external acceptance moves a pending request off the current page (count %i)", (pendingCount) => {
        state.requests = Array.from({ length: 10 }, (_, index) => ({ ...request, id: index + 1 })); state.pending = 11; state.totalItems = 11;
        const view = render(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).not.toHaveBeenCalled();
        state.requests = [...state.requests.slice(1), { ...request, id: 11 }]; state.pending = pendingCount;
        view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).toHaveBeenCalledExactlyOnceWith(state.dispatch);
        state.requests = [...state.requests]; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).toHaveBeenCalledOnce();
    });
    it("does not infer financial changes from ordinary pagination or another user's pending count", () => {
        state.requests = [request]; state.pending = 11; state.totalItems = 11;
        const view = render(<InternalTransferRequests accounts={accounts} />);
        fireEvent.click(screen.getByTitle("Next Page"));
        state.requests = [{ ...request, id: 20 }]; state.dataPage = 2; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).not.toHaveBeenCalled();
        state.userId = 2; state.pending = 0; state.requests = []; view.rerender(<InternalTransferRequests accounts={accounts} />);
        expect(state.refresh).not.toHaveBeenCalled();
    });

});
