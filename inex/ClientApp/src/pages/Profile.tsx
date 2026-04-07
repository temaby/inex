import * as React from "react";
import { useEffect, useState } from "react";
import { Form, Input, Button, Card, Select, Typography, message, Divider } from "antd";
import BasicPage from "../layouts/BasicPage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile, changePassword } from "../store/auth/auth-actions";
import apiClient from "../utils/apiClient";

const { Title } = Typography;

interface Currency {
  id: number;
  key: string;
  name: string;
}

interface ProfileFormValues {
  username: string;
  currencyId: number;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile = () => {
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
      profileForm.setFieldsValue({ username: user.username, currencyId: user.currencyId });
    }
  }, [user]);

  const onProfileFinish = async (values: ProfileFormValues) => {
    setIsSavingProfile(true);
    try {
      await dispatch(updateProfile({ username: values.username, currencyId: values.currencyId }));
      message.success("Profile updated.");
    } catch (error: any) {
      message.error(error.response?.data?.detail ?? "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordFinish = async (values: PasswordFormValues) => {
    setIsSavingPassword(true);
    try {
      await dispatch(changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }));
      message.success("Password changed.");
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail ?? "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <BasicPage title="Profile">
      <div style={{ maxWidth: 480 }}>
        <Card>
          <Title level={5} style={{ marginTop: 0 }}>Profile Info</Title>
          <Form form={profileForm} layout="vertical" onFinish={onProfileFinish}>
            <Form.Item label="Email">
              <Input size="large" value={user?.email ?? ""} disabled />
            </Form.Item>
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Username is required" },
                { min: 3, message: "At least 3 characters" },
              ]}
            >
              <Input size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="currencyId"
              label="Default Currency"
              rules={[{ required: true, message: "Please select a currency" }]}
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
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isSavingProfile}>
                Save
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <Title level={5}>Change Password</Title>
          <Form form={passwordForm} layout="vertical" onFinish={onPasswordFinish}>
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: "Enter your current password" }]}
            >
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: "Enter a new password" },
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
                { required: true, message: "Confirm your new password" },
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
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </BasicPage>
  );
};

export default Profile;
