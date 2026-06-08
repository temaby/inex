import { BarChart3, Target, Wallet } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";

const featureIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.1)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

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
    <div
      className="r-auth-shell"
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        background: "var(--bg-app)",
      }}
    >
      <style>{`
        .r-auth-shell, .r-auth-shell * {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .r-auth-shell {
            grid-template-columns: 1fr !important;
          }
          .r-auth-brand {
            display: none !important;
          }
          .r-auth-mobile-logo {
            display: flex !important;
          }
          .r-auth-form-wrap {
            padding: 32px 20px !important;
            align-items: flex-start !important;
          }
          .r-auth-form-panel {
            max-width: none !important;
          }
        }
      `}</style>

      <aside
        className="r-auth-brand"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "48px 56px",
          minHeight: "100vh",
          background: "linear-gradient(135deg, var(--brand-ink), #1A2D43)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <svg
          width="520"
          height="520"
          viewBox="0 0 520 520"
          fill="none"
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -140,
            bottom: -160,
            opacity: 0.04,
          }}
        >
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

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 78 }}>
            <span
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.12)",
                display: "grid",
                placeItems: "center",
                color: "var(--income-200)",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              In
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: 0,
                color: "#fff",
              }}
            >
              InEx
            </span>
          </div>

          <h1
            style={{
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: 0,
              color: "#fff",
              lineHeight: 1.15,
              margin: 0,
              maxWidth: 440,
            }}
          >
            {t("auth.brandLineOne")}
            <br />
            {t("auth.brandLineTwo")}
            <br />
            <span style={{ color: "var(--income-200)" }}>{t("auth.brandLineAccent")}</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.6,
              marginTop: 20,
              maxWidth: 520,
            }}
          >
            {t("auth.brandSubtitle")}
          </p>

          <div style={{ display: "grid", gap: 22, marginTop: 46, maxWidth: 540 }}>
            {features.map((feature) => (
              <div key={feature.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={featureIconStyle}>{feature.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    {feature.title}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255, 255, 255, 0.62)" }}>
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", fontSize: 12, color: "rgba(255, 255, 255, 0.45)" }}>
          {t("auth.brandFooter")}
        </div>
      </aside>

      <main
        className="r-auth-form-wrap"
        style={{
          minHeight: "100vh",
          padding: "48px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "hidden",
        }}
      >
        <div className="r-auth-form-panel" style={{ width: "100%", maxWidth: 400 }}>
          <div
            className="r-auth-mobile-logo"
            style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 24 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "var(--income-50)",
                color: "var(--income-600)",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              In
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: 0,
                color: "var(--fg-1)",
              }}
            >
              <span style={{ color: "var(--income-600)" }}>In</span>Ex
            </span>
          </div>

          <Outlet />

          <div
            style={{
              marginTop: 28,
              textAlign: "center",
              fontSize: 13,
              color: "var(--fg-3)",
            }}
          >
            {isLogin ? (
              <>
                {t("auth.dontHaveAccount")}{" "}
                <Link to="/register" style={{ color: "var(--income-600)", fontWeight: 500 }}>
                  {t("auth.register")}
                </Link>
              </>
            ) : (
              <>
                {t("auth.alreadyHaveAccount")}{" "}
                <Link to="/login" style={{ color: "var(--income-600)", fontWeight: 500 }}>
                  {t("auth.signIn")}
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
