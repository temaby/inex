import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  dispatch: vi.fn(),
  changeLanguage: vi.fn(),
  apiGet: vi.fn(),
}));

let authState = {
  accessToken: null as string | null,
  isInitializing: false,
  error: null as string | null,
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.getStarted": "Get started",
        "auth.registerTitle": "Create your InEx account",
        "auth.registerSubtitle": "Bring your accounts together in one private dashboard.",
        "auth.username": "Username",
        "auth.usernamePlaceholder": "e.g. ada.lovelace",
        "auth.email": "Email",
        "auth.emailPlaceholder": "you@example.com",
        "auth.password": "Password",
        "auth.confirmPassword": "Confirm Password",
        "auth.passwordMismatch": "Passwords do not match",
        "auth.language": "Language",
        "auth.inviteToken": "Invite Token",
        "auth.inviteTokenHint": "InEx is invite-only",
        "auth.createAccount": "Create Account",
        "auth.passwordStrengthWeak": "Weak",
        "auth.passwordStrengthOk": "OK",
        "auth.passwordStrengthGood": "Good",
        "auth.passwordStrengthStrong": "Strong",
        "auth.errors.duplicateEmail": "Email is already registered",
        "auth.errors.registrationFailed": "Could not create the account. Check the form and try again.",
        "common.currency": "Currency",
        "accounts.currencyPlaceholder": "Select currency",
        "language.en": "English",
        "language.ru": "Russian",
        "errors.username.required": "Username is required",
        "errors.email.required": "Email is required",
        "errors.email.invalid_format": "Enter a valid email address",
        "errors.password.required": "Password is required",
        "errors.password.min_length": "Password must be at least 8 characters",
        "errors.currency_id.invalid": "Please select a valid currency",
        "errors.invite_token.required": "Invite token is required",
      })[key] ?? key,
  }),
}));

vi.mock("../store/hooks", () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: (state: { auth: typeof authState }) => unknown) => selector({ auth: authState }),
}));

vi.mock("../store/auth/auth-actions", () => ({
  registerUser: vi.fn((values: unknown) => ({ type: "auth/registerUser", payload: values })),
}));

vi.mock("../store/auth/auth-slice", () => ({
  setAuthError: vi.fn((message: string) => ({ type: "auth/setAuthError", payload: message })),
}));

vi.mock("../utils/apiClient", () => ({
  default: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
  },
}));

vi.mock("../i18n", () => ({
  default: {
    language: "en",
    changeLanguage: mocks.changeLanguage,
  },
}));

describe("Register", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string): MediaQueryList => ({
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

  beforeEach(() => {
    authState = { accessToken: null, isInitializing: false, error: null };
    mocks.navigate.mockReset();
    mocks.dispatch.mockReset();
    mocks.changeLanguage.mockReset();
    mocks.apiGet.mockResolvedValue({
      data: [
        { id: 1, key: "USD", name: "US Dollar" },
        { id: 2, key: "EUR", name: "Euro" },
      ],
    });
  });

  it("renders localized fields with password-manager-safe names and invite-token hint", async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Create your InEx account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("name", "new-password");
    expect(screen.getByLabelText("Confirm Password")).toHaveAttribute("name", "new-password-confirm");
    expect(screen.getByLabelText("Invite Token")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("Invite Token")).toHaveAttribute("name", "invite-token");
    expect(screen.getByText("InEx is invite-only")).toBeInTheDocument();
    expect(await screen.findByText("EUR - Euro")).toBeInTheDocument();
  });

  it("shows a loading state instead of the form while the session is restoring", () => {
    authState = { accessToken: null, isInitializing: true, error: null };
    mocks.apiGet.mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Create your InEx account" })).not.toBeInTheDocument();
    expect(document.querySelector(".ant-spin")).toBeInTheDocument();
  });

  it("shows a localized currency load error when currencies cannot be fetched", async () => {
    mocks.apiGet.mockRejectedValue(new Error("network"));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Please select a valid currency")).toBeInTheDocument();
  });

  it("shows password strength feedback and localized validation errors", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Password"), "Password123!");
    expect(screen.getByText("Strong")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Invite token is required")).toBeInTheDocument();
  });

  it("maps register API errors, clears them on edit, and redirects success to dashboard", async () => {
    const user = userEvent.setup();
    authState = { accessToken: null, isInitializing: false, error: "Email already exists" };
    let resolveDispatch: () => void = () => undefined;
    mocks.dispatch.mockReturnValue(new Promise<void>((resolve) => {
      resolveDispatch = resolve;
    }));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByText("Email is already registered")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Username"), "ada");
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "auth/setAuthError", payload: "" });

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1!");
    await user.type(screen.getByLabelText("Invite Token"), "invite-123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByRole("button")).toBeDisabled();
    resolveDispatch();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"));
  });

  it("uses a localized fallback for unclassified register API errors", async () => {
    authState = { accessToken: null, isInitializing: false, error: "Unexpected backend detail" };

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Could not create the account. Check the form and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Unexpected backend detail")).not.toBeInTheDocument();
  });

  it("does not misclassify non-email duplicate errors as duplicate email", async () => {
    authState = { accessToken: null, isInitializing: false, error: "Username already exists" };

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Could not create the account. Check the form and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Email is already registered")).not.toBeInTheDocument();
  });
});
