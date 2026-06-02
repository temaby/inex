import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, Table, Tag, Drawer, Checkbox, Grid, Space } from "antd";

const { useBreakpoint } = Grid;
import type { TableColumnsType } from "antd";
import BasicPage from "../layouts/BasicPage";

import { CategoryDetails, getCategoriesTree } from '../model/Category/CategoryDetails';
import CategoryEditForm from './Categories/CategoryEditForm';
import CategoryCreateForm from './Categories/CategoryCreateForm';

import { CategoryResponse, useGetCategoriesQuery } from '../store/categories/categories-api';

const Categories = () => {
    const { t } = useTranslation();
    const screens = useBreakpoint();
    const isMobile = screens.md === false;

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(true);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const { data: categories = [], isLoading } = useGetCategoriesQuery("ALL");
    const filteredCategories = showOnlyEnabled ? categories.filter((c: CategoryResponse) => c.isEnabled) : categories;
    const categoryFlatList = useMemo(() => getCategoriesTree(filteredCategories, true) as (Omit<CategoryDetails, "children"> & { depth: number })[], [filteredCategories]);

    useEffect(() => {
        setExpandedRows([]);
    }, [categories]);

    const closeModalHandler = () => {
        setAddModalVisible(false);
    };

    const showModalHandler = () => {
        setAddModalVisible(true);
    };

    const rowExpandHandler = (expanded: boolean, record: Omit<CategoryDetails, "children"> & { depth: number }) => {
        if (expanded) {
            setExpandedRows(record ? [record.id.toString()] : []);
        } else {
            setExpandedRows([]);
        }
    };

    const columns: TableColumnsType<Omit<CategoryDetails, "children"> & { depth: number }> = [
        {
            title: t("categories.category"),
            dataIndex: "name",
            key: "name",
            render: (text: string, record) => (
                <span style={{ paddingLeft: record.depth * 32, borderLeft: record.depth > 0 ? "2px solid #eee" : undefined }}>
                    {text}
                </span>
            ),
        },
        {
            title: t("categories.status"),
            dataIndex: "isEnabled",
            key: "isEnabled",
            width: 50,
            align: "center",
            render: (isEnabled: boolean) =>
                isEnabled
                    ? (<Tag color="green">{t("categories.active")}</Tag>)
                    : (<Tag color="red">{t("categories.disabled")}</Tag>),
        },
    ];

    const expandedRowRender = (record: any) => {
        return <CategoryEditForm record={record} />;
    };

    return (
        <React.Fragment>
            <Drawer
                title={t("categories.addDrawerTitle")}
                width={isMobile ? "100%" : 420}
                height={isMobile ? "90%" : undefined}
                placement={isMobile ? "bottom" : "right"}
                onClose={closeModalHandler}
                open={addModalVisible}
                styles={{ body: { paddingBottom: 80 } }}>
                <CategoryCreateForm onCreated={closeModalHandler} />
            </Drawer>
            <BasicPage
                title={t("categories.title")}
                extra={[
                    <Space key="controls">
                        <Checkbox
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}>
                            {t("categories.activeOnly")}
                        </Checkbox>
                        <Button
                            key="addCategory"
                            onClick={showModalHandler}
                            size="large"
                            type="primary"
                            style={{ margin: "4px 0px" }}>
                            {t("common.add")}
                        </Button>
                    </Space>
                ]}>
                <div style={{ minHeight: "76vh", background: "white" }}>
                    <Table
                        dataSource={categoryFlatList}
                        columns={columns}
                        rowKey={(record) => record.id.toString()}
                        loading={isLoading}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        locale={{ emptyText: t("categories.empty") }}
                        expandable={{
                            expandedRowRender: expandedRowRender,
                            rowExpandable: () => true,
                            showExpandColumn: false,
                            expandRowByClick: true,
                            onExpand: rowExpandHandler,
                            expandedRowKeys: expandedRows
                        }}
                    />
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Categories;
