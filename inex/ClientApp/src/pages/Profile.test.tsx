import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Profile from "./Profile";
import apiClient from "../utils/apiClient";
import { changePassword, updateProfile } from "../store/auth/auth-actions";
import { useAppDispatch, useAppSelector } from "../store/hooks";

vi.mock("../layouts/BasicPage", () => ({
    default: ({ children, title, subtitle }: { children: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }) => (
        <main>
            <p>{subtitle}</p>
            <h1>{title}</h1>
            {children}
        </main>
    ),
}));

vi.mock("../utils/apiClient", () => ({
    default: {
        get: vi.fn(),
    },
}));

vi.mock("../store/auth/auth-actions", () => ({
    changePassword: vi.fn((payload: unknown) => ({ payload, type: "auth/changePassword" })),
    updateProfile: vi.fn((payload: unknown) => ({ payload, type: "auth/updateProfile" })),
}));

vi.mock("../store/hooks", () => ({
    useAppDispatch: vi.fn(),
    useAppSelector: vi.fn(),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: { language: "en" },
        t: (key: string, values?: Record<string, string | number>) => {
            if (!values) return key;
            return Object.entries(values).reduce(
                (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
                key,
            );
        },
    }),
}));

const mockApiGet = vi.mocked(apiClient.get);
const mockChangePassword = vi.mocked(changePassword);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockUseAppDispatch = vi.mocked(useAppDispatch);
const mockUseAppSelector = vi.mocked(useAppSelector);

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
    })),
});

describe("Profile", () => {
    const dispatch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        dispatch.mockResolvedValue({});
        mockUseAppDispatch.mockReturnValue(dispatch);
        mockUseAppSelector.mockReturnValue({
            id: 7,
            email: "alex@example.com",
            username: "alex",
            currencyId: 2,
            languageCode: "en",
        });
        mockApiGet.mockResolvedValue({
            data: [
                { id: 1, key: "USD", name: "US Dollar" },
                { id: 2, key: "EUR", name: "Euro" },
            ],
        });
    });

    it("renders the settings workspace with localized profile labels and mobile tab rail", async () => {
        render(<Profile />);

        expect(screen.getByRole("heading", { name: "profile.title" })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "profile.tabs.label" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "profile.tabs.account" })).toHaveAttribute("aria-current", "location");
        expect(screen.getByRole("button", { name: "profile.tabs.security" })).toBeInTheDocument();
        expect(screen.getByText("profile.account.title")).toBeInTheDocument();
        expect(screen.getByText("profile.security.title")).toBeInTheDocument();

        await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith("/currencies"));
        expect(screen.queryByText("Confirm New Password")).not.toBeInTheDocument();
    });

    it("preserves the updateProfile dispatch contract", async () => {
        render(<Profile />);

        const username = await screen.findByLabelText("auth.username");
        fireEvent.change(username, { target: { value: "alex-updated" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.account.save" }));

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith({
                username: "alex-updated",
                currencyId: 2,
                languageCode: "en",
            });
        });
        expect(dispatch).toHaveBeenCalledWith({ payload: {
            username: "alex-updated",
            currencyId: 2,
            languageCode: "en",
        }, type: "auth/updateProfile" });
    });

    it("maps profile API validation codes to localized field errors", async () => {
        dispatch.mockRejectedValueOnce({
            response: {
                data: {
                    errors: {
                        username: ["username.required"],
                    },
                },
            },
        });

        render(<Profile />);

        fireEvent.change(await screen.findByLabelText("auth.username"), { target: { value: "server-rejected" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.account.save" }));

        expect(await screen.findByText("errors.username.required")).toBeInTheDocument();
        expect(screen.queryByText("profile.errors.profileUpdateFailed")).not.toBeInTheDocument();
    });

    it("maps profile identity domain errors to localized field errors", async () => {
        dispatch.mockRejectedValueOnce({
            response: {
                data: {
                    errors: ["Username already taken."],
                },
            },
        });

        render(<Profile />);

        fireEvent.change(await screen.findByLabelText("auth.username"), { target: { value: "server-rejected" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.account.save" }));

        expect(await screen.findByText("profile.errors.usernameRejected")).toBeInTheDocument();
        expect(screen.queryByText("profile.errors.profileUpdateFailed")).not.toBeInTheDocument();
    });

    it("shows localized password validation and preserves changePassword payload", async () => {
        render(<Profile />);

        fireEvent.change(screen.getByLabelText("auth.currentPassword"), { target: { value: "old-password" } });
        fireEvent.change(screen.getByLabelText("auth.newPassword"), { target: { value: "new-password" } });
        fireEvent.change(screen.getByLabelText("profile.security.confirmPassword"), { target: { value: "different-password" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.security.save" }));

        expect(await screen.findByText("profile.validation.passwordMismatch")).toBeInTheDocument();
        expect(mockChangePassword).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText("profile.security.confirmPassword"), { target: { value: "new-password" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.security.save" }));

        await waitFor(() => {
            expect(mockChangePassword).toHaveBeenCalledWith({
                currentPassword: "old-password",
                newPassword: "new-password",
            });
        });
    });

    it("maps password API validation codes to localized field errors", async () => {
        dispatch.mockRejectedValueOnce({
            response: {
                data: {
                    errors: {
                        current_password: ["current_password.required"],
                        new_password: ["new_password.min_length"],
                    },
                },
            },
        });

        render(<Profile />);

        fireEvent.change(await screen.findByLabelText("auth.currentPassword"), { target: { value: "old-password" } });
        fireEvent.change(screen.getByLabelText("auth.newPassword"), { target: { value: "server-rejected-password" } });
        fireEvent.change(screen.getByLabelText("profile.security.confirmPassword"), { target: { value: "server-rejected-password" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.security.save" }));

        expect(await screen.findByText("errors.current_password.required")).toBeInTheDocument();
        expect(await screen.findByText("errors.new_password.min_length")).toBeInTheDocument();
        expect(screen.queryByText("profile.errors.passwordChangeFailed")).not.toBeInTheDocument();
    });

    it("maps password identity domain errors to localized field errors", async () => {
        dispatch.mockRejectedValueOnce({
            response: {
                data: {
                    errors: ["Incorrect password."],
                },
            },
        });

        render(<Profile />);

        fireEvent.change(await screen.findByLabelText("auth.currentPassword"), { target: { value: "wrong-password" } });
        fireEvent.change(screen.getByLabelText("auth.newPassword"), { target: { value: "server-rejected-password" } });
        fireEvent.change(screen.getByLabelText("profile.security.confirmPassword"), { target: { value: "server-rejected-password" } });
        fireEvent.click(screen.getByRole("button", { name: "profile.security.save" }));

        expect(await screen.findByText("profile.errors.currentPasswordIncorrect")).toBeInTheDocument();
        expect(screen.queryByText("profile.errors.passwordChangeFailed")).not.toBeInTheDocument();
    });
});
