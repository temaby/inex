import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert, Select } from "antd";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { registerUser } from "../store/auth/auth-actions";
import { setAuthError } from "../store/auth/auth-slice";
import apiClient from "../utils/apiClient";
import i18n from "../i18n";

const { Title, Text } = Typography;

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

const Register = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const authError = useAppSelector((s) => s.auth.error);

  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useEffect(() => {
    if (accessToken) navigate("/transactions", { replace: true });
  }, [accessToken]);

  useEffect(() => {
    apiClient.get<Currency[]>("/currencies").then(({ data }) => {
      setCurrencies(data);
      const eur = data.find((c) => c.key === "EUR");
      if (eur) form.setFieldValue("currencyId", eur.id);
    });
  }, []);

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
      navigate("/transactions");
    } catch {
      // Error already stored in auth.error by the thunk
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 420 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          {t("auth.createAccount")}
        </Title>

        {authError && (
          <Alert
            message={authError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

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
            <Input size="large" placeholder={t("auth.username")} autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="email"
            label={t("auth.email")}
            rules={[
              { required: true, message: t("errors.email.required") },
              { type: "email", message: t("errors.email.invalid_format") },
            ]}
          >
            <Input size="large" placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label={t("auth.password")}
            rules={[
              { required: true, message: t("errors.password.required") },
              { min: 8, message: t("errors.password.min_length") },
            ]}
          >
            <Input.Password size="large" placeholder={t("auth.password")} autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t("auth.confirmPassword")}
            dependencies={["password"]}
            rules={[
              { required: true, message: t("errors.password.required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("auth.passwordMismatch")));
                },
              }),
            ]}
          >
            <Input.Password size="large" placeholder={t("auth.confirmPassword")} autoComplete="new-password" />
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
                label: `${c.key} — ${c.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="languageCode"
            label={t("auth.language")}
          >
            <Select size="large" onChange={handleLanguageChange}>
              <Select.Option value="en">{t("language.en")}</Select.Option>
              <Select.Option value="ru">{t("language.ru")}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="inviteToken"
            label={t("auth.inviteToken")}
            rules={[{ required: true, message: t("errors.invite_token.required") }]}
          >
            <Input size="large" placeholder={t("auth.inviteToken")} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
              block
            >
              {t("auth.createAccount")}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">{t("auth.alreadyHaveAccount")} </Text>
          <Link to="/login">{t("auth.signIn")}</Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
