import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const navigateMock = vi.fn();
const dispatchMock = vi.fn();

let authState = {
  accessToken: null as string | null,
  isInitializing: false,
  error: null as string | null,
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.welcomeBack": "Welcome back",
        "auth.signInTitle": "Sign in to InEx",
        "auth.signInSubtitle": "Use your account credentials to access your dashboard.",
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.signIn": "Sign In",
        "auth.errors.invalidCredentials": "Invalid credentials",
        "auth.errors.loginFailed": "Could not sign in. Check your credentials and try again.",
        "errors.email.required": "Email is required",
        "errors.email.invalid_format": "Enter a valid email address",
        "errors.password.required": "Password is required",
      })[key] ?? key,
  }),
}));

vi.mock("../store/hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: { auth: typeof authState }) => unknown) => selector({ auth: authState }),
}));

vi.mock("../store/auth/auth-actions", () => ({
  loginUser: vi.fn((values: unknown) => ({ type: "auth/loginUser", payload: values })),
}));

vi.mock("../store/auth/auth-slice", () => ({
  setAuthError: vi.fn((message: string) => ({ type: "auth/setAuthError", payload: message })),
}));

describe("Login", () => {
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
    navigateMock.mockReset();
    dispatchMock.mockReset();
  });

  it("renders localized auth form copy with password-manager attributes", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in to InEx" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("name", "password");
  });

  it("shows a loading state instead of the form while the session is restoring", () => {
    authState = { accessToken: null, isInitializing: true, error: null };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Sign in to InEx" })).not.toBeInTheDocument();
    expect(document.querySelector(".ant-spin")).toBeInTheDocument();
  });

  it("maps API errors into the auth error banner and clears them on edit", async () => {
    const user = userEvent.setup();
    authState = { accessToken: null, isInitializing: false, error: "Invalid credentials" };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "a");

    expect(dispatchMock).toHaveBeenCalledWith({ type: "auth/setAuthError", payload: "" });
  });

  it("uses a localized fallback for unclassified login API errors", () => {
    authState = { accessToken: null, isInitializing: false, error: "Unexpected backend detail" };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Could not sign in. Check your credentials and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Unexpected backend detail")).not.toBeInTheDocument();
  });

  it("shows localized client validation and disables submit while login is in flight", async () => {
    const user = userEvent.setup();
    let resolveDispatch: () => void = () => undefined;
    dispatchMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveDispatch = resolve;
    }));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("button")).toBeDisabled();
    resolveDispatch();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard"));
  });
});
