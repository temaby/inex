import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthShell from "./AuthShell";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.brandLineOne": "Every penny.",
        "auth.brandLineTwo": "Every account.",
        "auth.brandLineAccent": "One picture.",
        "auth.brandSubtitle": "Private finance dashboard.",
        "auth.featureAccountsTitle": "Multi-currency, multi-account",
        "auth.featureAccountsDescription": "Track balances across currencies.",
        "auth.featureBudgetsTitle": "Budgets that actually work",
        "auth.featureBudgetsDescription": "See projected overruns.",
        "auth.featureReportsTitle": "Reports built for reflection",
        "auth.featureReportsDescription": "Review trends without spreadsheets.",
        "auth.brandFooter": "InEx auth footer",
        "auth.dontHaveAccount": "Don't have an account?",
        "auth.register": "Register",
        "auth.alreadyHaveAccount": "Already have an account?",
        "auth.signIn": "Sign In",
      })[key] ?? key,
  }),
}));

describe("AuthShell", () => {
  it("renders the split auth shell and login footer route link", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<AuthShell />}>
            <Route path="/login" element={<div>Login form outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Every penny\.\s*Every account\.\s*One picture\./ })).toBeInTheDocument();
    expect(screen.getByText("One picture.")).toBeInTheDocument();
    expect(screen.getByText("Multi-currency, multi-account")).toBeInTheDocument();
    expect(screen.getByText("Login form outlet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  it("ships mobile breakpoint styles that hide the brand panel and show the mobile logo", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route element={<AuthShell />}>
            <Route path="/register" element={<div>Register form outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector(".r-auth-shell")).toBeInTheDocument();
    expect(container.querySelector(".r-auth-brand")).toBeInTheDocument();
    expect(container.querySelector(".r-auth-mobile-logo")).toBeInTheDocument();
    expect(container.querySelector("style")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });
});
