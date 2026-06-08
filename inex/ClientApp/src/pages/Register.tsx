import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";

import ErrorBanner from "../components/ErrorBanner";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { registerUser } from "../store/auth/auth-actions";
import { setAuthError } from "../store/auth/auth-slice";
import apiClient from "../utils/apiClient";
import i18n from "../i18n";
import { translateRegisterError } from "./auth-error-message";

interface Currency {
  id: number;
  key: string;
  name: string;
}

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  currencyId: number;
  inviteToken: string;
  languageCode: string;
}

const passwordStrength = (pwd: string): number => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  return score;
};

const strengthLabelKey = (score: number) => {
  if (score <= 2) return "auth.passwordStrengthWeak";
  if (score <= 3) return "auth.passwordStrengthOk";
  if (score === 4) return "auth.passwordStrengthGood";
  return "auth.passwordStrengthStrong";
};

const strengthColor = (score: number) => {
  if (score <= 2) return "var(--expense-500)";
  if (score <= 3) return "var(--warn-500)";
  return "var(--income-500)";
};

const Register = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const authError = useAppSelector((s) => s.auth.error);
  const displayError = translateRegisterError(authError, t);
  const password = Form.useWatch("password", form) ?? "";
  const strength = passwordStrength(password);

  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useEffect(() => {
    if (accessToken) navigate("/dashboard", { replace: true });
  }, [accessToken, navigate]);

  useEffect(() => {
    apiClient.get<Currency[]>("/currencies").then(({ data }) => {
      setCurrencies(data);
      const eur = data.find((c) => c.key === "EUR");
      if (eur) form.setFieldValue("currencyId", eur.id);
    });
  }, [form]);

  const onValuesChange = () => {
    if (authError) dispatch(setAuthError(""));
  };

  const handleLanguageChange = (lang: string) => {
    form.setFieldValue("languageCode", lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("i18n_lang", lang);
  };

  const onFinish = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
        currencyId: values.currencyId,
        inviteToken: values.inviteToken,
        languageCode: values.languageCode,
      }));
      navigate("/dashboard");
    } catch {
      // Error already stored in auth.error by the thunk.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          {t("auth.getStarted")}
        </div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "var(--fg-1)",
            letterSpacing: 0,
            margin: 0,
          }}
        >
          {t("auth.registerTitle")}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--fg-3)",
            marginTop: 6,
            marginBottom: 0,
          }}
        >
          {t("auth.registerSubtitle")}
        </p>
      </div>

      <ErrorBanner message={displayError} />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={onValuesChange}
        initialValues={{ languageCode: i18n.language }}
      >
        <Form.Item
          name="username"
          label={t("auth.username")}
          rules={[{ required: true, message: t("errors.username.required") }]}
        >
          <Input
            size="large"
            autoComplete="username"
            name="username"
            placeholder={t("auth.usernamePlaceholder")}
          />
        </Form.Item>

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
            autoComplete="email"
            name="email"
            placeholder={t("auth.emailPlaceholder")}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t("auth.password")}
          rules={[
            { required: true, message: t("errors.password.required") },
            { min: 8, message: t("errors.password.min_length") },
          ]}
        >
          <Input.Password
            size="large"
            placeholder={t("auth.password")}
            autoComplete="new-password"
            name="new-password"
          />
        </Form.Item>

        {password && (
          <div style={{ marginTop: -10, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map((segment) => (
                <span
                  key={segment}
                  aria-hidden="true"
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: segment <= strength ? strengthColor(strength) : "var(--border-1)",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{t(strengthLabelKey(strength))}</div>
          </div>
        )}

        <Form.Item
          name="confirmPassword"
          label={t("auth.confirmPassword")}
          dependencies={["password"]}
          rules={[
            { required: true, message: t("errors.password.required") },
            ({ getFieldValue }) => ({
              validator(_, value: string | undefined) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("auth.passwordMismatch")));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            placeholder={t("auth.confirmPassword")}
            autoComplete="new-password"
            name="new-password-confirm"
          />
        </Form.Item>

        <Form.Item
          name="currencyId"
          label={t("common.currency")}
          rules={[{ required: true, message: t("errors.currency_id.invalid") }]}
        >
          <Select
            size="large"
            placeholder={t("accounts.currencyPlaceholder")}
            showSearch
            optionFilterProp="label"
            options={currencies.map((c) => ({
              value: c.id,
              label: `${c.key} - ${c.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="languageCode" label={t("auth.language")}>
          <Select size="large" onChange={handleLanguageChange}>
            <Select.Option value="en">{t("language.en")}</Select.Option>
            <Select.Option value="ru">{t("language.ru")}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="inviteToken"
          label={t("auth.inviteToken")}
          extra={t("auth.inviteTokenHint")}
          rules={[{ required: true, message: t("errors.invite_token.required") }]}
        >
          <Input
            size="large"
            placeholder={t("auth.inviteToken")}
            autoComplete="off"
            name="invite-token"
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
            disabled={isSubmitting}
            block
          >
            {t("auth.createAccount")}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default Register;
