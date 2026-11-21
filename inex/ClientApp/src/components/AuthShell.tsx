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
        <span className="r-auth-watermark" aria-hidden="true" />

        <div className="r-auth-brand__content">
          <img className="r-auth-brand__logo" src="/assets/logo-horizontal-on-dark.svg" alt="InEx" width="352" height="128" />

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
          <img className="r-auth-mobile-logo" src="/assets/logo-horizontal.svg" alt="InEx" width="352" height="128" />

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
