import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { Button, Table, Tag, Drawer, Checkbox, Space } from "antd";
import { ColumnsType } from "antd/es/table";
import BasicPage from "../layouts/BasicPage";

import { CategoryDetails, getCategoriesTree } from '../model/Category/CategoryDetails';
import CategoryEditForm from './Categories/CategoryEditForm';
import CategoryCreateForm from './Categories/CategoryCreateForm';

import { fetchCategories } from '../store/categories/categories-actions';

const Categories = () => {
    const dispatch = useAppDispatch();
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(true);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const categories = useAppSelector(state => state.categories.items);
    const categoriesLastUpdate = useAppSelector(state => state.categories.lastUpdate);
    const filteredCategories = showOnlyEnabled  ? categories.filter((c: any) => c.isEnabled) : categories;
    const categoryFlatList = useMemo(() => getCategoriesTree(filteredCategories, true) as (Omit<CategoryDetails, "children"> & { depth: number })[], [filteredCategories]);

    useEffect(() => {
        dispatch(fetchCategories("ALL"));
        setExpandedRows([]);
    }, [categoriesLastUpdate]);

    const closeModalHandler = () => {
        setAddModalVisible(false);
    };

    const showModalHandler = () => {
        setAddModalVisible(true);
    };

    const rowExpandHandler = (expanded: boolean, record: any) => {
        if (expanded) {
            setExpandedRows(record ? [record.id.toString()] : []);
        } else {
            setExpandedRows([]);
        }
    };

    const columns: ColumnsType<Omit<CategoryDetails, "children"> & { depth: number }> = [
        {
            title: "Категория",
            dataIndex: "name",
            key: "name",
            width: 500,
            render: (text: string, record) => (
                <span style={{ paddingLeft: record.depth * 32,borderLeft: record.depth > 0 ? "2px solid #eee" : undefined }}>
                    {text}
                </span>
            ),
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

    const expandedRowRender = (record: any) => {
        return <CategoryEditForm record={record} />;
    };
    
    return (
        <React.Fragment>
            <Drawer
                title="Добавить категорию"
                width={420}
                onClose={closeModalHandler}
                open={addModalVisible}
                placement="right"
                bodyStyle={{ paddingBottom: 80 }}>
                <CategoryCreateForm onCreated={closeModalHandler} />
            </Drawer>
            <BasicPage
                title="Категории"
                extra={[
                    <Space key="controls">
                        <Checkbox
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}>
                            Только активные
                        </Checkbox>
                        <Button
                            key="addCategory"
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
                        dataSource={categoryFlatList}
                        columns={columns}
                        rowKey={(record: any) => record.id.toString()}
                        pagination={false}
                        scroll={{ x: 370 }}
                        locale={{ emptyText: "Нет категорий для отображения" }}
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