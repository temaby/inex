import * as React from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { Layout, PageHeader, Menu } from "antd";
const { Header, Content, Footer } = Layout;

const BasicPage = (props: any) => {
    const navigate = useNavigate();
    const currentPage: string = useLocation().pathname.slice(1).split('/', 1)[0];

    const menuSelectHandler = (e: any) => {
        navigate(`/${e.key}`);
    };

    return (
        <Layout>
            <Header style={{ backgroundColor: "white" }}>
                <Menu style={{ margin: "0 0 0 400px" }} mode="horizontal" defaultSelectedKeys={[currentPage]} onSelect={menuSelectHandler}>
                    <Menu.Item key="transactions">Транзакции</Menu.Item>
                    <Menu.Item key="accounts">Счета</Menu.Item>
                    <Menu.Item key="categories">Категории</Menu.Item>
                    <Menu.Item key="budgets">Бюджеты</Menu.Item>
                    <Menu.Item key="reports">Отчеты</Menu.Item>
                </Menu>
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
