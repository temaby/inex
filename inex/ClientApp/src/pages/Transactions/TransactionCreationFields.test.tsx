import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreationAmount, CreationComment, CreationDate } from "./TransactionCreationFields";

const language = vi.hoisted(() => ({ value: "en" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({
    i18n: { resolvedLanguage: language.value },
    t: (key: string, values?: Record<string, string>) => `${key}${values ? ` ${Object.values(values).join(" ")}` : ""}`,
}) }));

beforeEach(() => {
    language.value = "en";
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

function Amount({ currency = "PLN" }: { currency?: string }) {
    const [value, setValue] = React.useState(0);
    return <><CreationAmount id="amount" value={value} currency={currency} onChange={value => setValue(value ?? 0)} />
        <output data-testid="amount-value">{value}</output></>;
}

describe("Transaction creation fields", () => {
    it("starts empty, accepts comma decimals and expressions, and clears stale submitted values", async () => {
        const user = userEvent.setup();
        render(<Amount />);
        const input = screen.getByPlaceholderText("0.00");
        expect(input).toHaveValue("");
        expect(input).toHaveAttribute("inputmode", "decimal");
        fireEvent.change(input, { target: { value: "12,34" } });
        expect(screen.getByTestId("amount-value")).toHaveTextContent("12.34");
        await user.clear(input);
        expect(screen.getByTestId("amount-value")).toHaveTextContent("0");
        await user.type(input, "2+3");
        expect(input).toHaveValue("2+3");
        fireEvent.blur(input);
        expect(input).toHaveValue("5.00");
        fireEvent.change(input, { target: { value: "5+" } });
        expect(screen.getByTestId("amount-value")).toHaveTextContent("0");
    });

    it("rounds payload precision and formats Russian decimals without changing currency amounts", async () => {
        language.value = "ru";
        const { rerender } = render(<Amount />);
        const input = screen.getByPlaceholderText("0,00");
        await userEvent.type(input, "10/3");
        fireEvent.blur(input);
        expect(input).toHaveValue("3,33");
        expect(screen.getByTestId("amount-value")).toHaveTextContent("3.33");
        rerender(<Amount currency="USD" />);
        expect(input).toHaveValue("3,33");
        expect(screen.getByText("transactions.currencyChanged USD")).toHaveTextContent("transactions.currencyChanged USD");
        expect(screen.getByText("USD")).toBeInTheDocument();
    });

    it("preserves markers when the optional comment is collapsed and reopened", async () => {
        const user = userEvent.setup();
        function Comment() {
            const [comment, setComment] = React.useState("");
            return <CreationComment comment={comment} onChange={event => setComment(event.target.value)} />;
        }
        render(<Comment />);
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "transactions.addComment" }));
        await user.type(screen.getByRole("textbox"), "Lunch #food @family");
        await user.click(screen.getByRole("button", { name: "transactions.hideComment" }));
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "transactions.addComment" }));
        expect(screen.getByRole("textbox")).toHaveValue("Lunch #food @family");
    });

    it("expands existing comments and always exposes required correction reasons", () => {
        const view = render(<CreationComment comment="Existing #tag" onChange={vi.fn()} />);
        expect(screen.getByRole("textbox")).toHaveValue("Existing #tag");
        view.rerender(<CreationComment comment="" required onChange={vi.fn()} error="Reason required" />);
        expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "255");
        expect(screen.getByText("Reason required")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("displays historical dates explicitly and reopens the picker with the selected date", async () => {
        const user = userEvent.setup();
        render(<CreationDate date={dayjs("2020-05-06")} onChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: "May 6, 2020" })).toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "transactions.editDate" }));
        expect(screen.getByRole("textbox", { name: "transactions.date" })).toHaveValue("2020-05-06");
        await user.keyboard("{Escape}");
        expect(screen.getByRole("button", { name: "May 6, 2020" })).toHaveFocus();
        await user.click(screen.getByRole("button", { name: "May 6, 2020" }));
        expect(screen.getByRole("textbox", { name: "transactions.date" })).toHaveValue("2020-05-06");
    });

    it("preserves focus on another field when the date editor is dismissed by clicking outside", async () => {
        const user = userEvent.setup();
        render(<><CreationDate date={dayjs("2020-05-06")} onChange={vi.fn()} /><input aria-label="Next field" /></>);
        await user.click(screen.getByRole("button", { name: "transactions.editDate" }));
        await user.click(screen.getByRole("textbox", { name: "Next field" }));
        expect(screen.getByRole("textbox", { name: "Next field" })).toHaveFocus();
    });
});
