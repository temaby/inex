import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Drawer, Grid, Layout, Tabs } from "antd";
import { FilterOutlined } from "@ant-design/icons";

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

import BasicPage from "../layouts/BasicPage";
import TransactionCreate from "./Transactions/TransactionCreate";
import TransactionList from "./Transactions/TransactionList";
import TransactionSummary from "./Transactions/TransactionSummary";
import TransactionFilterForm from "./Transactions/TransactionFilterForm";

const Transactions = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams: URLSearchParams = new URLSearchParams(location.search);
    const filter: string | null = queryParams.get("filter");
    const sideMode: string = filter === null ? "status" : "filter";

    const allAccounts = useAppSelector(state => state.accounts.items);
    const allCategories = useAppSelector(state => state.categories.items);
    const filterState = useAppSelector(state => state.transactions.filter);

    const activeAccounts = allAccounts.filter((a: any) => a.isEnabled);
    const activeCategories = allCategories.filter((c: any) => c.isEnabled);

    const isFilterActive =
        filterState.accountIds.length > 0 ||
        filterState.categoryIds.length > 0 ||
        filterState.tags.length > 0 ||
        filterState.refs.length > 0 ||
        filterState.range.length > 0;

    const screens = useBreakpoint();
    const isMobile = screens.md === false;

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

    const sideModeChangeHandler = (mode: any) => {
        navigate(`${location.pathname}?${mode === "filter" ? "filter=" : ""}`, { replace: true });
    };

    const extraButtons = [
        isMobile && (
            <Badge key="filterBadge" dot={isFilterActive}>
                <Button
                    key="filterButton"
                    icon={<FilterOutlined />}
                    size="large"
                    onClick={() => setFilterDrawerVisible(true)}
                    style={{ margin: "4px 4px 4px 0" }}
                />
            </Badge>
        ),
        <Button key="addTransaction" onClick={() => setAddModalVisible(true)} size="large" type="primary" style={{ margin: "4px 0px" }}>
            {t("transactions.add")}
        </Button>,
    ];

    return (
        <React.Fragment>
            {/* Add transaction drawer — bottom sheet on mobile, right panel on desktop */}
            <Drawer
                title={t("transactions.addDrawerTitle")}
                width={isMobile ? "100%" : 420}
                height={isMobile ? "90%" : undefined}
                placement={isMobile ? "bottom" : "right"}
                onClose={() => setAddModalVisible(false)}
                open={addModalVisible}
                styles={{ body: { paddingBottom: 80 } }}
            >
                <TransactionCreate accounts={activeAccounts} categories={activeCategories} onSubmit={() => setAddModalVisible(false)} />
            </Drawer>

            {/* Mobile filter drawer */}
            {isMobile && (
                <Drawer
                    title={t("transactions.filter")}
                    placement="bottom"
                    height="85%"
                    onClose={() => setFilterDrawerVisible(false)}
                    open={filterDrawerVisible}
                    styles={{ body: { padding: "20px" } }}
                >
                    <TransactionFilterForm
                        accounts={activeAccounts}
                        categories={activeCategories}
                        filter={filter}
                    />
                </Drawer>
            )}

            <BasicPage title={t("transactions.title")} extra={extraButtons}>
                {!isMobile && (
                    <Sider theme="light" style={{ margin: "0 0 65px 0", minHeight: 280 }} width={350}>
                        <Tabs
                            onChange={sideModeChangeHandler}
                            activeKey={sideMode}
                            type="card"
                            items={[
                                {
                                    key: "status",
                                    label: t("transactions.status"),
                                    children: <TransactionSummary accounts={activeAccounts} />,
                                },
                                {
                                    key: "filter",
                                    label: <Badge dot={isFilterActive} offset={[6, 0]}>{t("transactions.filter")}</Badge>,
                                    children: <TransactionFilterForm accounts={activeAccounts} categories={activeCategories} filter={filter} />,
                                    style: { padding: "20px" },
                                },
                            ]}
                        />
                    </Sider>
                )}
                <Content style={{ margin: isMobile ? 0 : "0 0 0 24px", minHeight: 280 }}>
                    <TransactionList accounts={allAccounts} categories={allCategories} />
                </Content>
            </BasicPage>
        </React.Fragment>
    );
};

export default Transactions;
