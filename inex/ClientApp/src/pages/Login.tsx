import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert } from "antd";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginUser } from "../store/auth/auth-actions";
import { setAuthError } from "../store/auth/auth-slice";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginFormValues>();

  // isSubmitting lives in local state — purely UI concern, no other component needs it
  const [isSubmitting, setIsSubmitting] = useState(false);

  // auth.error lives in Redux — set by the loginUser thunk on API failure
  const authError = useAppSelector((s) => s.auth.error);

  // Already logged in — redirect away from the login page
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useEffect(() => {
    if (accessToken) navigate("/transactions", { replace: true });
  }, [accessToken]);

  // Clear the server error whenever the user starts editing the form,
  // so stale "Invalid credentials" doesn't linger while they retype
  const onValuesChange = () => {
    if (authError) dispatch(setAuthError(""));
  };

  const onFinish = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(loginUser(values));
      navigate("/transactions");
    } catch {
      // Error already stored in auth.error by the thunk — nothing to do here
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
          Sign In
        </Title>

        {authError && (
          <Alert
            message={authError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/*
          Form.useForm() gives AntD full control of field values and validation.
          onFinish fires only after all rules pass — no manual validation needed.
          onValuesChange fires on every keystroke — used here to clear server errors.
        */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={onValuesChange}
        >
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
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password size="large" placeholder="Password" autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            {/*
              loading prop on Button shows a spinner and disables the button —
              prevents double-submit while the API call is in flight
            */}
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">Don't have an account? </Text>
          {/*
            <Link> does a client-side route transition — no page reload,
            Redux state is preserved. A plain <a href> would wipe all state.
          */}
          <Link to="/register">Register</Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
