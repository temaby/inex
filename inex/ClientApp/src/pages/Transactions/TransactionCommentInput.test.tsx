import * as React from "react";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../../utils/apiClient";
import { transactionsApi } from "../../store/transactions/transactions-api";
import TransactionCommentInput from "./TransactionCommentInput";

vi.mock("../../utils/apiClient", () => ({ default: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const mockClient = vi.mocked(apiClient);
const auth = createSlice({ name: "auth", initialState: { user: { id: 1 } },
    reducers: { change: (state, action: { payload: number }) => { state.user.id = action.payload; } } });
const createStore = () => configureStore({ reducer: { auth: auth.reducer, [transactionsApi.reducerPath]: transactionsApi.reducer },
    middleware: getDefault => getDefault().concat(transactionsApi.middleware) });

function setup(value = "", maxLength?: number) {
    const store = createStore(); const submitted = vi.fn(); const escaped = vi.fn();
    function Comment() {
        const [comment, setComment] = React.useState(value);
        return <form onSubmit={event => { event.preventDefault(); submitted(); }} onKeyDown={event => { if (event.key === "Escape") escaped(); }}>
            <button type="button">Previous field</button>
            <TransactionCommentInput aria-label="Comment" value={comment} maxLength={maxLength} onChange={event => setComment(event.target.value)} />
            <button type="submit">Save</button><output>{comment}</output>
        </form>;
    }
    const view = render(<Provider store={store}><Comment /></Provider>);
    return { ...view, store, submitted, escaped, input: screen.getByRole("combobox") as HTMLInputElement };
}

describe("transaction comment autocomplete", () => {
    beforeEach(() => { mockClient.mockReset(); mockClient.mockResolvedValue({ data: { suggestions: ["mary", "mark"] } }); });

    it("debounces lookup and accepts a highlighted inline token without submitting", async () => {
        const user = userEvent.setup(); const { input, submitted } = setup("Dinner @ma yesterday");
        await user.click(input); input.setSelectionRange(10, 10); fireEvent.select(input);
        expect(mockClient).not.toHaveBeenCalled();
        await screen.findByRole("option", { name: "@mary" });
        expect(mockClient).toHaveBeenCalledWith(expect.objectContaining({ params: { type: "ref", query: "ma" } }));
        await user.keyboard("{ArrowDown}{Enter}");
        expect(input).toHaveValue("Dinner @mark yesterday"); expect(input.selectionStart).toBe(12);
        expect(submitted).not.toHaveBeenCalled(); expect(input).toHaveFocus();
    });

    it("supports Tab and pointer selection, Escape stops at the input and blur closes", async () => {
        const user = userEvent.setup(); const { input, escaped } = setup("#ma");
        await user.click(input); await screen.findByRole("option", { name: "#mary" });
        await user.keyboard("{Escape}"); expect(input).toHaveAttribute("aria-expanded", "false"); expect(escaped).not.toHaveBeenCalled();
        await user.type(input, "r"); await screen.findByRole("option", { name: "#mary" });
        await user.keyboard("{Tab}"); expect(input).toHaveValue("#mary"); expect(input).toHaveFocus();
        await user.clear(input); await user.type(input, "@ma"); await screen.findByRole("option", { name: "@mary" });
        await user.click(screen.getByRole("option", { name: "@mark" })); expect(input).toHaveValue("@mark"); expect(input).toHaveFocus();
        await user.click(screen.getByRole("button", { name: "Save" })); expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("preserves Shift+Tab navigation and reopens a dismissed token on refocus", async () => {
        const user = userEvent.setup(); const { input, submitted } = setup("#ma");
        await user.click(input); await screen.findByRole("option", { name: "#mary" });
        await user.tab({ shift: true });
        expect(screen.getByRole("button", { name: "Previous field" })).toHaveFocus();
        expect(input).toHaveValue("#ma"); expect(submitted).not.toHaveBeenCalled();
        await user.click(input); await screen.findByRole("option", { name: "#mary" });
        await user.keyboard("{Escape}"); expect(input).toHaveAttribute("aria-expanded", "false");
        await user.click(screen.getByRole("button", { name: "Previous field" })); await user.click(input);
        await screen.findByRole("option", { name: "#mary" }); expect(input).toHaveValue("#ma");
    });

    it("keeps a selectable highlight when refreshed results become shorter", async () => {
        const user = userEvent.setup(); const { input, store } = setup("#ma");
        await user.click(input); await screen.findByRole("option", { name: "#mary" }); await user.keyboard("{ArrowDown}");
        mockClient.mockResolvedValue({ data: { suggestions: ["maria"] } });
        act(() => { store.dispatch(transactionsApi.util.invalidateTags([{ type: "Transaction", id: "COMMENTS" }])); });
        expect(await screen.findByRole("option", { name: "#maria" })).toHaveAttribute("aria-selected", "true");
        await user.keyboard("{Enter}"); expect(input).toHaveValue("#maria");
    });

    it("does not accept a suggestion while confirming composed text", async () => {
        const user = userEvent.setup(); const { input, submitted } = setup("@ma");
        await user.click(input); await screen.findByRole("option", { name: "@mary" });
        fireEvent.compositionStart(input);
        fireEvent.input(input, { target: { value: "@ма" }, isComposing: true, inputType: "insertCompositionText" });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 229, isComposing: true });
        expect(input).toHaveValue("@ма"); expect(submitted).not.toHaveBeenCalled();
        fireEvent.compositionEnd(input, { data: "ма" });
        expect(input).toHaveValue("@ма");
    });

    it("keeps free text and saves usable when lookup fails or has no matches", async () => {
        mockClient.mockRejectedValueOnce(new Error("Offline"));
        const user = userEvent.setup(); const { input, submitted } = setup("#new");
        await user.click(input); await screen.findByText("transactions.commentSuggestionsUnavailable");
        await user.click(screen.getByRole("button", { name: "Save" })); expect(submitted).toHaveBeenCalledOnce(); expect(input).toHaveValue("#new");
        mockClient.mockResolvedValue({ data: { suggestions: [] } });
        await user.click(input); await user.type(input, "-tag"); await screen.findByText("transactions.commentSuggestionsEmpty");
        expect(input).toHaveValue("#new-tag");
    });

    it("ignores composition and old identity/query results", async () => {
        let resolveOld: ((value: { data: { suggestions: string[] } }) => void) | undefined;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
        const user = userEvent.setup(); const { input, store } = setup("#ma");
        await user.click(input); await waitFor(() => expect(mockClient).toHaveBeenCalledOnce());
        fireEvent.compositionStart(input); expect(input).toHaveAttribute("aria-expanded", "false");
        fireEvent.compositionEnd(input);
        act(() => { store.dispatch(auth.actions.change(2)); });
        await act(async () => { resolveOld?.({ data: { suggestions: ["private-old"] } }); });
        expect(screen.queryByRole("option", { name: "#private-old" })).not.toBeInTheDocument();
        await screen.findByRole("option", { name: "#mary" });
        await user.clear(input); await user.type(input, "ordinary@email");
        expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("does not offer replacements beyond maxlength or consume unhandled Tab", async () => {
        const user = userEvent.setup(); const { input } = setup("#ma", 4);
        await user.click(input); await screen.findByText("transactions.commentSuggestionsEmpty");
        expect(screen.queryByRole("option")).not.toBeInTheDocument();
        await user.keyboard("{Tab}"); expect(screen.getByRole("button", { name: "Save" })).toHaveFocus(); expect(input).toHaveValue("#ma");
    });

    it("keeps the current marker type and options when an earlier query finishes later", async () => {
        let resolveOld: ((value: { data: { suggestions: string[] } }) => void) | undefined;
        mockClient.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
            .mockResolvedValue({ data: { suggestions: ["current-ref"] } });
        const user = userEvent.setup(); const { input } = setup("#ma");
        await user.click(input); await waitFor(() => expect(mockClient).toHaveBeenCalledOnce());
        await user.clear(input); await user.type(input, "@cu");
        await screen.findByRole("option", { name: "@current-ref" });
        await act(async () => { resolveOld?.({ data: { suggestions: ["old-tag"] } }); });
        expect(screen.getByRole("option", { name: "@current-ref" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: /old-tag/ })).not.toBeInTheDocument();
    });
});
