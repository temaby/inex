import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeftRight,
    BarChart3,
    LogOut,
    Target,
    Tag,
    Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUser } from "../store/auth/auth-actions";
import "./AppShell.css";

interface AppShellProps {
    title: string;
    subtitle?: string;
    extra?: React.ReactNode;
    children: React.ReactNode;
}

type NavKey = "transactions" | "accounts" | "categories" | "budgets" | "reports";

interface NavItem {
    key: NavKey;
    labelKey: string;
    path: `/${NavKey}`;
    icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
    { key: "transactions", labelKey: "nav.transactions", path: "/transactions", icon: ArrowLeftRight },
    { key: "accounts", labelKey: "nav.accounts", path: "/accounts", icon: Wallet },
    { key: "categories", labelKey: "nav.categories", path: "/categories", icon: Tag },
    { key: "budgets", labelKey: "nav.budgets", path: "/budgets", icon: Target },
    { key: "reports", labelKey: "nav.reports", path: "/reports", icon: BarChart3 },
] as const;

const getInitials = (username?: string) => {
    const normalized = username?.trim();

    if (!normalized) {
        return "IN";
    }

    return normalized.slice(0, 2).toUpperCase();
};

const Logo = () => (
    <div className="inex-logo" aria-label="InEx">
        <span className="inex-logo__mark" aria-hidden="true">I</span>
        <span className="inex-logo__wordmark">InEx</span>
    </div>
);

const AppShell = ({ title, subtitle, extra, children }: AppShellProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const username = useAppSelector((s) => s.auth.user?.username);
    const currentPage = location.pathname.slice(1).split("/", 1)[0];
    const initials = getInitials(username);

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
    };

    return (
        <div className="inex-shell">
            <header className="inex-topnav r-topnav">
                <div className="inex-topnav__brand r-topnav-brand">
                    <Logo />
                </div>

                <nav className="inex-topnav__items r-topnav-items" aria-label={t("nav.mainNav")}>
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = currentPage === item.key;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`inex-nav-tab${active ? " is-active" : ""}`}
                                aria-current={active ? "page" : undefined}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                                <span>{t(item.labelKey)}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="inex-topnav__actions r-topnav-actions">
                    <button
                        type="button"
                        className="inex-user-pill r-user-pill"
                        aria-label={t("nav.profile")}
                        onClick={() => handleNavigate("/profile")}
                    >
                        <span className="inex-user-pill__avatar" aria-hidden="true">{initials}</span>
                        {username && <span className="inex-user-pill__name r-user-pill-name">{username}</span>}
                    </button>

                    <button
                        type="button"
                        className="inex-shell-icon-button"
                        aria-label={t("nav.signOut")}
                        title={t("nav.signOut")}
                        onClick={handleLogout}
                    >
                        <LogOut size={16} aria-hidden="true" />
                    </button>
                </div>
            </header>

            <div className="inex-page-head r-page-head">
                <div className="inex-page-head__main">
                    {subtitle && <div className="inex-page-head__subtitle">{subtitle}</div>}
                    <h1 className="inex-page-head__title r-page-head-title">{title}</h1>
                </div>
                {extra && <div className="inex-page-head__right r-page-head-right">{extra}</div>}
            </div>

            <main className="inex-page-body r-page-body">{children}</main>

            <nav className="r-bottom-nav" aria-label={t("nav.mainNav")}>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = currentPage === item.key;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            className={`r-bottom-nav__item${active ? " is-active" : ""}`}
                            aria-current={active ? "page" : undefined}
                            onClick={() => handleNavigate(item.path)}
                        >
                            <span className="r-bottom-nav__icon-wrap">
                                <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                            </span>
                            <span>{t(item.labelKey)}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export { AppShell };
export type { AppShellProps };
export default AppShell;
