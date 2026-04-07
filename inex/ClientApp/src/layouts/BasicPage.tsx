import * as React from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { Layout, PageHeader, Menu, Typography, Space } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUser } from "../store/auth/auth-actions";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const BasicPage = (props: any) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentPage: string = useLocation().pathname.slice(1).split('/', 1)[0];

    const username = useAppSelector((s) => s.auth.user?.username);

    const menuSelectHandler = (e: any) => {
        navigate(`/${e.key}`);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        // logoutUser dispatches clearAuth() which sets accessToken=null,
        // ProtectedRoute then redirects to /login automatically
    };

    return (
        <Layout>
            <Header style={{ backgroundColor: "white", display: "flex", alignItems: "center" }}>
                <Menu
                    style={{ flex: 1, margin: "0 0 0 400px" }}
                    mode="horizontal"
                    defaultSelectedKeys={[currentPage]}
                    onSelect={menuSelectHandler}
                >
                    <Menu.Item key="transactions">Транзакции</Menu.Item>
                    <Menu.Item key="accounts">Счета</Menu.Item>
                    <Menu.Item key="categories">Категории</Menu.Item>
                    <Menu.Item key="budgets">Бюджеты</Menu.Item>
                    <Menu.Item key="reports">Отчеты</Menu.Item>
                </Menu>

                <Space style={{ marginLeft: 24, flexShrink: 0 }}>
                    {username && (
                        <Space
                            size={4}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/profile")}
                            title="Profile"
                        >
                            <UserOutlined />
                            <Text type="secondary">{username}</Text>
                        </Space>
                    )}
                    <LogoutOutlined
                        title="Sign out"
                        onClick={handleLogout}
                        style={{ cursor: "pointer", fontSize: 16, color: "#595959" }}
                    />
                </Space>
            </Header>

            <Content style={{ padding: "0 50px" }}>
                <PageHeader title={props.title} extra={props.extra} style={{ minHeight: 90 }} />
                <Layout style={{ padding: "0 24px" }}>{props.children}</Layout>
            </Content>
            <Footer style={{ textAlign: "center" }}>InEx ©2025</Footer>
        </Layout>
    );
};

export default BasicPage;
