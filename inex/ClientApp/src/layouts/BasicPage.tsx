import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Typography, Space, Flex } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUser } from "../store/auth/auth-actions";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const BasicPage = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentPage: string = useLocation().pathname.slice(1).split('/', 1)[0];

    const username = useAppSelector((s) => s.auth.user?.username);

    const menuSelectHandler = (e: any) => {
        navigate(`/${e.key}`);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
    };

    return (
        <Layout>
            <Header style={{ backgroundColor: "white", display: "flex", alignItems: "center" }}>
                <Menu
                    style={{ flex: 1, margin: "0 0 0 400px" }}
                    mode="horizontal"
                    defaultSelectedKeys={[currentPage]}
                    onSelect={menuSelectHandler}
                    items={[
                        { key: "transactions", label: t("nav.transactions") },
                        { key: "accounts",     label: t("nav.accounts") },
                        { key: "categories",   label: t("nav.categories") },
                        { key: "budgets",      label: t("nav.budgets") },
                        { key: "reports",      label: t("nav.reports") },
                    ]}
                />

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
                        title={t("nav.signOut")}
                        onClick={handleLogout}
                        style={{ cursor: "pointer", fontSize: 16, color: "#595959" }}
                    />
                </Space>
            </Header>

            <Content style={{ padding: "0 50px" }}>
                <Flex justify="space-between" align="center" style={{ minHeight: 90, padding: "16px 0" }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>{props.title}</Typography.Title>
                    {props.extra && <Space>{props.extra}</Space>}
                </Flex>
                <Layout style={{ padding: "0 24px" }}>{props.children}</Layout>
            </Content>
            <Footer style={{ textAlign: "center" }}>InEx ©2025</Footer>
        </Layout>
    );
};

export default BasicPage;
