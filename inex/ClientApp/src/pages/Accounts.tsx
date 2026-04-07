import * as React from "react";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { Button, Table, Tag, Drawer, Checkbox, Space } from "antd";
import { ColumnsType } from "antd/es/table";
import BasicPage from "../layouts/BasicPage";
import { AccountDetails } from "../model/Account/AccountDetails";
import AccountCreateForm from "./Accounts/AccountCreateForm";
import AccountEditForm from "./Accounts/AccountEditForm";
import { fetchAccounts } from "../store/accounts/accounts-actions";

const Accounts = () => {
    const dispatch = useAppDispatch();
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(true);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const accounts = useAppSelector(state => state.accounts.items);
    const accountsLastUpdate = useAppSelector(state => state.accounts.lastUpdate);
    const filteredAccounts = showOnlyEnabled ? accounts.filter((a: any) => a.isEnabled) : accounts;

    useEffect(() => {
        dispatch(fetchAccounts("ALL"));
        setExpandedRows([]);
    }, [accountsLastUpdate]);

    const columns: ColumnsType<AccountDetails> = [
        {
            title: "Account",
            dataIndex: "name",
            key: "name",
            width: 500,
        },
        {
            title: "Currency",
            dataIndex: "currency",
            key: "currency",
            width: 80,
        },
        {
            title: "Status",
            dataIndex: "isEnabled",
            key: "isEnabled",
            width: 80,
            align: "center",
            render: (isEnabled: boolean) =>
                isEnabled
                    ? <Tag color="green">Active</Tag>
                    : <Tag color="red">Disabled</Tag>,
        },
    ];

    const expandedRowRender = (record: any) => <AccountEditForm record={record} />;

    const rowExpandHandler = (expanded: boolean, record: any) => {
        setExpandedRows(expanded && record ? [record.id.toString()] : []);
    };

    return (
        <React.Fragment>
            <Drawer
                title="Add Account"
                width={420}
                onClose={() => setAddModalVisible(false)}
                open={addModalVisible}
                placement="right"
                bodyStyle={{ paddingBottom: 80 }}>
                <AccountCreateForm onCreated={() => setAddModalVisible(false)} />
            </Drawer>
            <BasicPage
                title="Accounts"
                extra={[
                    <Space key="controls">
                        <Checkbox
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}>
                            Active only
                        </Checkbox>
                        <Button
                            key="addAccount"
                            onClick={() => setAddModalVisible(true)}
                            size="large"
                            type="primary"
                            style={{ margin: "4px 0px" }}>
                            Add
                        </Button>
                    </Space>
                ]}>
                <div style={{ minHeight: "76vh", background: "white" }}>
                    <Table
                        dataSource={filteredAccounts}
                        columns={columns}
                        rowKey={(record: any) => record.id.toString()}
                        pagination={false}
                        scroll={{ x: 370 }}
                        locale={{ emptyText: "No accounts to display" }}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: () => true,
                            showExpandColumn: false,
                            expandRowByClick: true,
                            onExpand: rowExpandHandler,
                            expandedRowKeys: expandedRows,
                        }}
                    />
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Accounts;
