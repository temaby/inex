import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, Spin } from "antd";
import { useTranslation } from "react-i18next";

import ErrorBanner from "../components/ErrorBanner";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginUser } from "../store/auth/auth-actions";
import { setAuthError } from "../store/auth/auth-slice";
import { translateLoginError } from "./auth-error-message";
import "./auth-pages.css";

interface LoginFormValues {
  email: string;
  password: string;
}

const Login = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginFormValues>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const authError = useAppSelector((s) => s.auth.error);
  const displayError = translateLoginError(authError, t);

  const isInitializing = useAppSelector((s) => s.auth.isInitializing);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useEffect(() => {
    if (accessToken) navigate("/dashboard", { replace: true });
  }, [accessToken, navigate]);

  const onValuesChange = () => {
    if (authError) dispatch(setAuthError(""));
  };

  const onFinish = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(loginUser(values));
      navigate("/dashboard");
    } catch {
      // Error already stored in auth.error by the thunk.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isInitializing ? (
        <div className="auth-form-spinner">
          <Spin size="large" />
        </div>
      ) : (
        <>
      <header className="auth-form-header">
        <span className="auth-form-eyebrow">
          {t("auth.welcomeBack")}
        </span>
        <h2 className="auth-form-title">
          {t("auth.signInTitle")}
        </h2>
        <p className="auth-form-subtitle">
          {t("auth.signInSubtitle")}
        </p>
      </header>

      <ErrorBanner message={displayError} />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={onValuesChange}
      >
        <Form.Item
          name="email"
          label={t("auth.email")}
          rules={[
            { required: true, message: t("errors.email.required") },
            { type: "email", message: t("errors.email.invalid_format") },
          ]}
        >
          <Input
            size="large"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            autoComplete="email"
            name="email"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t("auth.password")}
          rules={[{ required: true, message: t("errors.password.required") }]}
        >
          <Input.Password
            size="large"
            placeholder={t("auth.password")}
            autoComplete="current-password"
            name="password"
          />
        </Form.Item>

        <Form.Item className="auth-form-submit">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
            disabled={isSubmitting}
            block
          >
            {t("auth.signIn")}
          </Button>
        </Form.Item>
      </Form>
        </>
      )}
    </>
  );
};

export default Login;
