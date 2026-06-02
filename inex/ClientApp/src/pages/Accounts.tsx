import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Table, Tag, Drawer, Checkbox, Grid, Space } from "antd";

const { useBreakpoint } = Grid;
import type { TableColumnsType } from "antd";
import BasicPage from "../layouts/BasicPage";
import AccountCreateForm from "./Accounts/AccountCreateForm";
import AccountEditForm from "./Accounts/AccountEditForm";
import { AccountResponse, useGetAccountsQuery } from "../store/accounts/accounts-api";

const Accounts = () => {
    const { t } = useTranslation();
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(true);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const screens = useBreakpoint();
    const isMobile = screens.md === false;

    const { data: accounts = [], isLoading } = useGetAccountsQuery("ALL");
    const filteredAccounts = showOnlyEnabled ? accounts.filter((a: AccountResponse) => a.isEnabled) : accounts;

    useEffect(() => {
        setExpandedRows([]);
    }, [accounts]);

    const columns: TableColumnsType<AccountResponse> = [
        {
            title: t("accounts.account"),
            dataIndex: "name",
            key: "name",
        },
        {
            title: t("accounts.currency"),
            dataIndex: "currency",
            key: "currency",
            width: 80,
            responsive: ["sm"],
        },
        {
            title: t("accounts.status"),
            dataIndex: "isEnabled",
            key: "isEnabled",
            width: 90,
            align: "center",
            render: (isEnabled: boolean) =>
                isEnabled
                    ? <Tag color="green">{t("accounts.active")}</Tag>
                    : <Tag color="red">{t("accounts.disabled")}</Tag>,
        },
    ];

    const expandedRowRender = (record: AccountResponse) => <AccountEditForm record={record} />;

    const rowExpandHandler = (expanded: boolean, record: AccountResponse) => {
        setExpandedRows(expanded && record ? [record.id.toString()] : []);
    };

    return (
        <React.Fragment>
            <Drawer
                title={t("accounts.addDrawerTitle")}
                width={isMobile ? "100%" : 420}
                height={isMobile ? "90%" : undefined}
                placement={isMobile ? "bottom" : "right"}
                onClose={() => setAddModalVisible(false)}
                open={addModalVisible}
                styles={{ body: { paddingBottom: 80 } }}>
                <AccountCreateForm onCreated={() => setAddModalVisible(false)} />
            </Drawer>
            <BasicPage
                title={t("accounts.title")}
                extra={[
                    <Space key="controls">
                        <Checkbox
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}>
                            {t("accounts.activeOnly")}
                        </Checkbox>
                        <Button
                            key="addAccount"
                            onClick={() => setAddModalVisible(true)}
                            size="large"
                            type="primary"
                            style={{ margin: "4px 0px" }}>
                            {t("common.add")}
                        </Button>
                    </Space>
                ]}>
                <div style={{ minHeight: "76vh", background: "white" }}>
                    <Table
                        dataSource={filteredAccounts}
                        columns={columns}
                        rowKey={(record) => record.id.toString()}
                        loading={isLoading}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        locale={{ emptyText: t("accounts.empty") }}
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
