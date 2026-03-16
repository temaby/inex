import * as React from "react";
import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Button, Table, Tag, Drawer, Checkbox, Space } from "antd";
import { ColumnsType } from "antd/es/table";
import BasicPage from "../layouts/BasicPage";
import { AccountDetails } from "../model/Account/AccountDetails";

const Accounts = () => {
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(true);

    const accounts = useSelector((state: any) => state.accounts.items);
    const filteredAccounts = showOnlyEnabled ? accounts.filter((c: any) => c.isEnabled) : accounts;

    const closeModalHandler = () => {
        setAddModalVisible(false);
    };

    const showModalHandler = () => {
        setAddModalVisible(true);
    };

    const columns: ColumnsType<AccountDetails> = [
        {
            title: "Счет",
            dataIndex: "name",
            key: "name",
            width: 500,
        },
        {
            title: "Статус",
            dataIndex: "isEnabled",
            key: "isEnabled",
            width: 50,
            align: "center",
            render: (isEnabled: boolean) =>
                isEnabled ? (<Tag color="green">Активна</Tag>) : (<Tag color="red">Отключена</Tag>),
        },
    ];

    return (
        <React.Fragment>
            <Drawer
                title="Добавить счет"
                width={420}
                onClose={closeModalHandler}
                open={addModalVisible}
                placement={"right"}
                bodyStyle={{ paddingBottom: 80 }}>
                <div>Test</div>
            </Drawer>
            <BasicPage
                title="Счета"
                extra={[
                    <Space key="controls">
                        <Checkbox
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}>
                            Только активные
                        </Checkbox>
                        <Button
                            key="addAccount"
                            onClick={showModalHandler}
                            size="large"
                            type="primary"
                            style={{ margin: "4px 0px" }}>
                            Добавить
                        </Button>
                    </Space>
                ]}>
                <div style={{ minHeight: "76vh", background: "white" }}>
                    <Table
                        dataSource={filteredAccounts}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 370 }}
                        locale={{ emptyText: "Нет счетов для отображения" }}
                    />
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Accounts;