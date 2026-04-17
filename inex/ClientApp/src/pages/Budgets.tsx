import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { Button, Table, Tag, Drawer, Space, Form, Input, InputNumber, Select, message, DatePicker, Typography } from "antd";
import { ColumnsType } from "antd/es/table";
import moment from "moment";
import { useSearchParams } from "react-router-dom";
import BasicPage from "../layouts/BasicPage";
import { BudgetDetails } from "../model/Budget/BudgetDetails";
import { BudgetEditState } from "../model/Budget/BudgetEditState";
import { fetchBudgets, createBudget, copyBudgets } from "../store/budgets/budgets-actions";
import { parseAxiosError } from "../utils/parseAxiosError";
import { fetchCategories } from "../store/categories/categories-actions";
import { CategoryDetails, getCategoriesTree } from "../model/Category/CategoryDetails";
import BudgetEditForm from "./Budgets/BudgetEditForm";
import Dropdown from "../components/Dropdown";
import ExpressionInputNumber from "../components/ExpressionInputNumber";
import { CopyOutlined } from "@ant-design/icons";

const CategoryDropdown = ({ value = [], onChange, categories, tree }: any) => {
    const { t } = useTranslation();
    const selection = categories.filter((c: any) => value.includes(c.id));

    const handleChange = (item: any) => {
        const id = +item.key;
        const newValue = value.includes(id)
            ? value.filter((v: number) => v !== id)
            : [...value, id];
        onChange(newValue);
    };

    return (
        <Dropdown
            id="category-dropdown"
            selection={selection}
            placeholder={t("budgets.selectCategories")}
            onChange={handleChange}
            items={tree}
            multiple={true}
        />
    );
};

const Budgets = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const dispatch = useAppDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const [modalVisible, setModalVisible] = useState(false);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const year = searchParams.get("year");
        const month = searchParams.get("month");
        if (year && month) {
            return moment(`${year}-${month}-01`, "YYYY-MM-DD");
        }
        return moment();
    });

    useEffect(() => {
        const year = selectedMonth.year().toString();
        const month = (selectedMonth.month() + 1).toString();
        if (searchParams.get("year") !== year || searchParams.get("month") !== month) {
            setSearchParams({ year, month });
        }
    }, [selectedMonth, setSearchParams, searchParams]);

    const budgets = useAppSelector(state => state.budgets?.items || []);
    const accounts = useAppSelector(state => state.accounts?.items || []);
    const currency = accounts.length > 0 ? accounts[0].currency : "USD";
    const allCategories = useAppSelector(state => state.categories?.items || []);
    const categories = React.useMemo(() => allCategories.filter((c: any) => c.isEnabled), [allCategories]);
    const isCreating = useAppSelector(state => state.budgets?.isCreating || false);
    const lastUpdate = useAppSelector(state => state.budgets?.lastUpdate);

    useEffect(() => {
        dispatch(fetchBudgets(selectedMonth.year(), selectedMonth.month() + 1));
        dispatch(fetchCategories("ALL"));
    }, [dispatch, lastUpdate, selectedMonth]);

    const closeModalHandler = () => {
        setModalVisible(false);
        form.resetFields();
    };

    const showAddModalHandler = () => {
        form.resetFields();
        setModalVisible(true);
    };

    const handleCreate = async (values: BudgetEditState) => {
        try {
            await dispatch(
                createBudget(
                    values.key,
                    values.name,
                    values.description,
                    values.value,
                    values.categoryIds || [],
                    values.year,
                    values.month
                )
            );
            message.success(t("budgets.created"));
            closeModalHandler();
        } catch (error) {
            message.error(parseAxiosError(error, t("budgets.createError"), t));
        }
    };

    const handleCopyFromPrevious = async () => {
        const prevMonth = selectedMonth.clone().subtract(1, 'month');
        try {
            await dispatch(
                copyBudgets(
                    prevMonth.year(),
                    prevMonth.month() + 1,
                    selectedMonth.year(),
                    selectedMonth.month() + 1
                )
            );
            message.success(t("budgets.created"));
        } catch (error) {
            message.error(parseAxiosError(error, t("budgets.createError"), t));
        }
    };

    const categoryTree = React.useMemo(() => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[], [categories, t]);

    const columns: ColumnsType<BudgetDetails> = [
        {
            title: t("budgets.name"),
            dataIndex: "name",
            key: "name",
            width: 250,
        },
        {
            title: t("budgets.description"),
            dataIndex: "description",
            key: "description",
            width: 300,
        },
        {
            title: t("budgets.year"),
            dataIndex: "year",
            key: "year",
            width: 100,
        },
        {
            title: t("budgets.month"),
            dataIndex: "month",
            key: "month",
            width: 100,
            render: (month: number) => moment().month(month - 1).format("MMMM"),
        },
        {
            title: t("budgets.amount"),
            dataIndex: "value",
            key: "value",
            width: 150,
            align: "right",
            render: (value: number) => value.toFixed(2),
        },
        {
            title: t("budgets.categories"),
            dataIndex: "categoryIds",
            key: "categoryIds",
            width: 300,
            render: (categoryIds: number[]) => {
                const categoryMap = new Map(allCategories.map((c: CategoryDetails) => [c.id, c]));
                return (
                    <>
                        {categoryIds && categoryIds.map((catId) => {
                            const cat = categoryMap.get(catId) as CategoryDetails | undefined;
                            return cat ? (
                                <Tag key={catId} color="blue">
                                    {cat.name}
                                </Tag>
                            ) : null;
                        })}
                    </>
                );
            },
        },
    ];

    const expandedRowRender = (record: BudgetDetails) => {
        return <BudgetEditForm record={record} currency={currency} onCollapse={() => setExpandedRows([])} />;
    };

    const onExpand = (expanded: boolean, record: BudgetDetails) => {
        if (expanded) {
            setExpandedRows([record.id]);
        } else {
            setExpandedRows([]);
        }
    };

    return (
        <React.Fragment>
            <Drawer
                title={t("budgets.addDrawerTitle")}
                width={520}
                onClose={closeModalHandler}
                open={modalVisible}
                placement="right"
                bodyStyle={{ paddingBottom: 80 }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    initialValues={{
                        key: "",
                        name: "",
                        description: "",
                        value: 0,
                        categoryIds: [],
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1,
                    }}
                >
                    <Form.Item
                        name="key"
                        label={t("budgets.key")}
                        rules={[{ required: true, message: "Please enter a key" }]}
                    >
                        <Input size="large" placeholder={t("budgets.keyPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label={t("budgets.name")}
                        rules={[{ required: true, message: "Please enter a name" }]}
                    >
                        <Input size="large" placeholder={t("budgets.namePlaceholder")} />
                    </Form.Item>

                    <Form.Item name="description" label={t("budgets.description")}>
                        <Input.TextArea size="large" rows={3} placeholder={t("budgets.descriptionPlaceholder")} />
                    </Form.Item>

                    <Form.Item name="categoryIds" label={t("budgets.categories")}>
                        <CategoryDropdown categories={categories} tree={categoryTree} />
                    </Form.Item>

                    <Form.Item
                        name="value"
                        label={t("budgets.amount")}
                        rules={[{ required: true, message: "Please enter an amount" }]}
                    >
                        <ExpressionInputNumber
                            size="large"
                            style={{ width: "100%" }}
                            precision={2}
                            placeholder="0.00"
                            addonAfter={currency}
                        />
                    </Form.Item>

                    <Form.Item
                        name="year"
                        label={t("budgets.year")}
                        rules={[{ required: true, message: "Please enter a year" }]}
                    >
                        <InputNumber
                            size="large"
                            style={{ width: "100%" }}
                            min={2020}
                            max={2030}
                            placeholder="2025"
                        />
                    </Form.Item>

                    <Form.Item
                        name="month"
                        label={t("budgets.month")}
                        rules={[{ required: true, message: "Please enter a month" }]}
                    >
                        <InputNumber
                            size="large"
                            style={{ width: "100%" }}
                            min={1}
                            max={12}
                            placeholder="12"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={isCreating}>
                                {t("budgets.create")}
                            </Button>
                            <Button onClick={closeModalHandler}>{t("budgets.cancel")}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>

            <BasicPage
                title={t("budgets.title")}
                extra={[
                    <DatePicker
                        key="monthPicker"
                        picker="month"
                        value={selectedMonth}
                        onChange={(val) => val && setSelectedMonth(val)}
                        allowClear={false}
                        size="large"
                        style={{ marginRight: 8 }}
                    />,
                    <Button
                        key="addBudget"
                        onClick={showAddModalHandler}
                        size="large"
                        type="primary"
                        style={{ margin: "4px 0px" }}
                    >
                        {t("common.add")}
                    </Button>,
                ]}
            >
                <div style={{ minHeight: "76vh", background: "white" }}>
                    {budgets.length === 0 && (
                        <div style={{ padding: 20, textAlign: "center" }}>
                            <p>{t("budgets.noData")}</p>
                            <Button
                                icon={<CopyOutlined />}
                                onClick={handleCopyFromPrevious}
                                loading={isCreating}
                            >
                                {t("budgets.copyFromPrevious")}
                            </Button>
                        </div>
                    )}
                    <Table
                        dataSource={budgets}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 1000 }}
                        locale={{ emptyText: t("budgets.empty") }}
                        expandable={{
                            expandedRowRender,
                            expandedRowKeys: expandedRows,
                            onExpand: onExpand,
                            showExpandColumn: false,
                            expandRowByClick: true
                        }}
                        summary={(pageData) => {
                            let total = 0;
                            pageData.forEach(({ value }) => {
                                total += value;
                            });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0}>{t("budgets.total")}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} colSpan={3}></Table.Summary.Cell>
                                        <Table.Summary.Cell index={4} align="right">
                                            <Typography.Text strong>{total.toFixed(2)}</Typography.Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={5}></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Budgets;
