import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  message: string | null;
}

const ErrorBanner = ({ message }: ErrorBannerProps) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        padding: "12px 14px",
        background: "var(--expense-50)",
        border: "1px solid var(--expense-100)",
        borderRadius: 8,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 20,
      }}
    >
      <AlertCircle
        size={16}
        aria-hidden="true"
        style={{ color: "var(--expense-600)", flexShrink: 0, marginTop: 1 }}
      />
      <div style={{ fontSize: 13, color: "var(--expense-700)", lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  );
};

export default ErrorBanner;
