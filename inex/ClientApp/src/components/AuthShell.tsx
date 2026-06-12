import { BarChart3, Target, Wallet } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "./AuthShell.css";

const AuthShell = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isLogin = pathname === "/login";

  const features = [
    {
      icon: <Wallet size={18} aria-hidden="true" />,
      title: t("auth.featureAccountsTitle"),
      description: t("auth.featureAccountsDescription"),
    },
    {
      icon: <Target size={18} aria-hidden="true" />,
      title: t("auth.featureBudgetsTitle"),
      description: t("auth.featureBudgetsDescription"),
    },
    {
      icon: <BarChart3 size={18} aria-hidden="true" />,
      title: t("auth.featureReportsTitle"),
      description: t("auth.featureReportsDescription"),
    },
  ];

  return (
    <div className="r-auth-shell">
      <aside className="r-auth-brand">
        <svg className="r-auth-watermark" width="520" height="520" viewBox="0 0 520 520" fill="none" aria-hidden="true">
          <path
            d="M260 24C129.661 24 24 129.661 24 260s105.661 236 236 236 236-105.661 236-236S390.339 24 260 24Zm0 76c88.366 0 160 71.634 160 160s-71.634 160-160 160S100 348.366 100 260 171.634 100 260 100Z"
            fill="currentColor"
          />
          <path
            d="M151 287c37.589-82.622 74.717-123.947 111.384-123.974C299.05 162.999 334.589 204.324 369 287"
            stroke="currentColor"
            strokeWidth="44"
            strokeLinecap="round"
          />
        </svg>

        <div className="r-auth-brand__content">
          <div className="r-auth-brand__logo">
            <span className="r-auth-brand__mark" aria-hidden="true">In</span>
            <span className="r-auth-brand__wordmark">InEx</span>
          </div>

          <h1 className="r-auth-brand__headline">
            {t("auth.brandLineOne")}
            <br />
            {t("auth.brandLineTwo")}
            <br />
            <span>{t("auth.brandLineAccent")}</span>
          </h1>

          <p className="r-auth-brand__subtitle">{t("auth.brandSubtitle")}</p>

          <div className="r-auth-features">
            {features.map((feature) => (
              <div className="r-auth-feature" key={feature.title}>
                <div className="r-auth-feature__icon">{feature.icon}</div>
                <div>
                  <div className="r-auth-feature__title">{feature.title}</div>
                  <div className="r-auth-feature__description">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="r-auth-brand__footer">{t("auth.brandFooter")}</div>
      </aside>

      <main className="r-auth-form-wrap">
        <div className="r-auth-form-panel">
          <div className="r-auth-mobile-logo">
            <span className="r-auth-mobile-logo__mark" aria-hidden="true">In</span>
            <span className="r-auth-mobile-logo__wordmark"><span>In</span>Ex</span>
          </div>

          <Outlet />

          <div className="r-auth-footer-link">
            {isLogin ? (
              <>
                {t("auth.dontHaveAccount")}{" "}
                <Link to="/register">{t("auth.register")}</Link>
              </>
            ) : (
              <>
                {t("auth.alreadyHaveAccount")}{" "}
                <Link to="/login">{t("auth.signIn")}</Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
