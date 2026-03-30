import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert } from "antd";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { registerUser } from "../store/auth/auth-actions";
import { setAuthError } from "../store/auth/auth-slice";

const { Title, Text } = Typography;

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const authError = useAppSelector((s) => s.auth.error);

  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useEffect(() => {
    if (accessToken) navigate("/transactions", { replace: true });
  }, [accessToken]);

  const onValuesChange = () => {
    if (authError) dispatch(setAuthError(""));
  };

  const onFinish = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
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
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          Create Account
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
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: "Username is required" },
              { min: 3, message: "Username must be at least 3 characters" },
            ]}
          >
            <Input size="large" placeholder="Username" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email address" },
            ]}
          >
            <Input size="large" placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password size="large" placeholder="Password" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              /*
               * Custom validator using getFieldValue — reads the sibling "password"
               * field from the same form instance and compares. AntD runs this
               * automatically whenever either field changes (due to `dependencies`).
               */
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password size="large" placeholder="Confirm password" autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
              block
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">Already have an account? </Text>
          <Link to="/login">Sign In</Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
