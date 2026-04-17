import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Card, Select, Typography, message, Divider } from "antd";
import BasicPage from "../layouts/BasicPage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile, changePassword } from "../store/auth/auth-actions";
import apiClient from "../utils/apiClient";
import { parseAxiosError } from "../utils/parseAxiosError";

const { Title } = Typography;

interface Currency {
  id: number;
  key: string;
  name: string;
}

interface ProfileFormValues {
  username: string;
  currencyId: number;
  languageCode: string | null;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    apiClient.get<Currency[]>("/currencies").then(({ data }) => setCurrencies(data));
  }, []);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        currencyId: user.currencyId,
        languageCode: user.languageCode ?? "en",
      });
    }
  }, [user]);

  const onProfileFinish = async (values: ProfileFormValues) => {
    setIsSavingProfile(true);
    try {
      await dispatch(updateProfile({
        username: values.username,
        currencyId: values.currencyId,
        languageCode: values.languageCode,
      }));
      message.success(t("auth.profileUpdated"));
    } catch (error) {
      message.error(parseAxiosError(error, "Failed to update profile.", t));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordFinish = async (values: PasswordFormValues) => {
    setIsSavingPassword(true);
    try {
      await dispatch(changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }));
      message.success(t("auth.passwordChanged"));
      passwordForm.resetFields();
    } catch (error) {
      message.error(parseAxiosError(error, "Failed to change password.", t));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <BasicPage title="Profile">
      <div style={{ maxWidth: 480 }}>
        <Card>
          <Title level={5} style={{ marginTop: 0 }}>{t("auth.updateProfile")}</Title>
          <Form form={profileForm} layout="vertical" onFinish={onProfileFinish}>
            <Form.Item label={t("auth.email")}>
              <Input size="large" value={user?.email ?? ""} disabled />
            </Form.Item>
            <Form.Item
              name="username"
              label={t("auth.username")}
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="currencyId"
              label={t("common.currency")}
              rules={[{ required: true }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                options={currencies.map((c) => ({
                  value: c.id,
                  label: `${c.key} — ${c.name}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="languageCode" label={t("auth.language")}>
              <Select size="large">
                <Select.Option value="en">{t("language.en")}</Select.Option>
                <Select.Option value="ru">{t("language.ru")}</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isSavingProfile}>
                {t("common.save")}
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <Title level={5}>{t("auth.changePassword")}</Title>
          <Form form={passwordForm} layout="vertical" onFinish={onPasswordFinish}>
            <Form.Item
              name="currentPassword"
              label={t("auth.currentPassword")}
              rules={[{ required: true }]}
            >
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label={t("auth.newPassword")}
              rules={[
                { required: true },
                { min: 8, message: "At least 8 characters" },
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={["newPassword"]}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isSavingPassword}>
                {t("auth.changePassword")}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </BasicPage>
  );
};

export default Profile;
