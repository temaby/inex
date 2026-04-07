import * as React from "react";
import { Button, Drawer, Layout, Tabs } from "antd";

const { Sider, Content } = Layout;

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

import BasicPage from "../layouts/BasicPage";
import TransactionCreate from "./Transactions/TransactionCreate";
import TransactionList from "./Transactions/TransactionList";
import TransactionSummary from "./Transactions/TransactionSummary";
import TransactionFilterForm from "./Transactions/TransactionFilterForm";

const Transactions = (props: any) => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams: URLSearchParams = new URLSearchParams(location.search);
    const filter: string | null = queryParams.get("filter");
    const sideMode: string = filter === null ? "status" : "filter";

    const allAccounts = useAppSelector(state => state.accounts.items);
    const allCategories = useAppSelector(state => state.categories.items);
        
    const activeAccounts = allAccounts.filter((a: any) => a.isEnabled);
    const activeCategories = allCategories.filter((c: any) => c.isEnabled);

    const [addModalVisible, setAddModalVisible] = useState(false);

    const closeModalHandler = () => {
      setAddModalVisible(false);
    };

    const showModalHandler = () => {
      setAddModalVisible(true);
    };

    const sideModeChangeHandler = (mode: any) => {
      navigate(`${location.pathname}?${mode === "filter" ? "filter=" : ""}`, { replace: true });
    };

    return (
      <React.Fragment>
        <Drawer
          title="Добавить транзакцию"
          width={420}
          onClose={closeModalHandler}
          open={addModalVisible}
          placement={"right"}
          bodyStyle={{ paddingBottom: 80 }}
        >
          <TransactionCreate accounts={activeAccounts} categories={activeCategories} onSubmit={closeModalHandler} />
        </Drawer>
        <BasicPage
          title="Транзакции"
          extra={[
              <Button key="addTransaction" onClick={showModalHandler} size="large" type="primary" style={{ margin: "4px 0px" }}>
                Добавить
              </Button>
          ]}>
          <Sider theme="light" style={{ margin: "0 0 65px 0", minHeight: 280 }} width={350}>
            <Tabs onChange={sideModeChangeHandler} activeKey={sideMode} type="card">
              <Tabs.TabPane tab="Статус" key="status">
                <TransactionSummary accounts={activeAccounts} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Фильтр" key="filter" style={{ padding: "20px" }}>
                <TransactionFilterForm accounts={activeAccounts} categories={activeCategories} filter={filter} />
              </Tabs.TabPane>
            </Tabs>
          </Sider>
          <Content style={{ margin: "0 0 0 24px", minHeight: 280 }}>
            <TransactionList accounts={activeAccounts} categories={activeCategories} />
          </Content>
        </BasicPage>
      </React.Fragment>
    );
};

export default Transactions;