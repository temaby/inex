import * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Typography, Space, Flex, Drawer, Button, Grid } from "antd";
import {
    LogoutOutlined, UserOutlined, MenuOutlined,
    HomeOutlined, SwapOutlined, BankOutlined, TagsOutlined, FundOutlined, BarChartOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUser } from "../store/auth/auth-actions";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const BasicPage = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const screens = useBreakpoint();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const currentPage: string = useLocation().pathname.slice(1).split('/', 1)[0];
    const username = useAppSelector((s) => s.auth.user?.username);

    const isMobile = screens.md === false;

    const navItems = [
        { key: "dashboard",    label: t("nav.dashboard"),    icon: <HomeOutlined /> },
        { key: "transactions", label: t("nav.transactions"), icon: <SwapOutlined /> },
        { key: "accounts",     label: t("nav.accounts"),     icon: <BankOutlined /> },
        { key: "categories",   label: t("nav.categories"),   icon: <TagsOutlined /> },
        { key: "budgets",      label: t("nav.budgets"),      icon: <FundOutlined /> },
        { key: "reports",      label: t("nav.reports"),      icon: <BarChartOutlined /> },
    ];

    const handleNavSelect = (e: any) => {
        navigate(`/${e.key}`);
        setDrawerOpen(false);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
    };

    return (
        <Layout>
            <Header style={{ backgroundColor: "white", display: "flex", alignItems: "center", padding: "0 16px" }}>
                {isMobile ? (
                    <>
                        <Button
                            type="text"
                            icon={<MenuOutlined style={{ fontSize: 18 }} />}
                            onClick={() => setDrawerOpen(true)}
                        />
                        <Typography.Title level={5} style={{ margin: "0 0 0 12px", flex: 1 }}>
                            InEx
                        </Typography.Title>
                        <UserOutlined
                            style={{ fontSize: 16, cursor: "pointer", color: "#595959" }}
                            onClick={() => navigate("/profile")}
                        />
                    </>
                ) : (
                    <>
                        <Menu
                            style={{ flex: 1 }}
                            mode="horizontal"
                            selectedKeys={[currentPage]}
                            onSelect={handleNavSelect}
                            items={navItems}
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
                    </>
                )}
            </Header>

            <Drawer
                title="InEx"
                placement="left"
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                width={280}
                styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[currentPage]}
                    onSelect={handleNavSelect}
                    items={navItems}
                    style={{ flex: 1, border: "none", fontSize: 15 }}
                />
                <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        {username && (
                            <Space
                                size={8}
                                style={{ cursor: "pointer" }}
                                onClick={() => { navigate("/profile"); setDrawerOpen(false); }}
                            >
                                <UserOutlined />
                                <Text>{username}</Text>
                            </Space>
                        )}
                        <Space size={8} style={{ cursor: "pointer" }} onClick={handleLogout}>
                            <LogoutOutlined />
                            <Text>{t("nav.signOut")}</Text>
                        </Space>
                    </Space>
                </div>
            </Drawer>

            <Content style={{ padding: isMobile ? "0 12px" : "0 50px" }}>
                <Flex
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap={8}
                    style={{ minHeight: isMobile ? 64 : 90, padding: "16px 0" }}
                >
                    <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                        {props.title}
                    </Typography.Title>
                    {props.extra && <Space>{props.extra}</Space>}
                </Flex>
                <Layout style={{ padding: isMobile ? 0 : "0 24px" }}>
                    {props.children}
                </Layout>
            </Content>

            <Footer style={{ textAlign: "center" }}>InEx ©2025</Footer>
        </Layout>
    );
};

export default BasicPage;
