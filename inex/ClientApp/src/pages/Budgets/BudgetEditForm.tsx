import * as React from "react";
import { useEffect, useReducer, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Divider, Row, Col, InputNumber, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { BudgetEditState } from "../../model/Budget/BudgetEditState";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { getCategoriesTree, CategoryDetails } from "../../model/Category/CategoryDetails";
import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import { CategoryResponse, useGetCategoriesQuery } from "../../store/categories/categories-api";
import {
    useDeleteBudgetMutation,
    useUpdateBudgetMutation,
} from "../../store/budgets/budgets-api";

const defaultState: BudgetEditState & { hasActiveChanges: boolean } = {
    id: 0,
    key: "",
    name: "",
    description: "",
    value: 0,
    categoryIds: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    hasActiveChanges: false
};

const reducer = (state: typeof defaultState, action: any): typeof defaultState => {
    switch (action.type) {
        case "INIT":
            return { ...state, ...action.value, hasActiveChanges: false };
        case "SET_FIELD":
            return { ...state, [action.field]: action.value, hasActiveChanges: true };
        default:
            return state;
    }
};

const BudgetEditForm = (props: any) => {
    const { t } = useTranslation();
    const { record, currency } = props;

    const [updateBudget, { isLoading: isUpdateLoading }] = useUpdateBudgetMutation();
    const [deleteBudget, { isLoading: isDeleteLoading }] = useDeleteBudgetMutation();
    const isUpdating = isUpdateLoading || isDeleteLoading;
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const categories = useMemo(() => allCategories.filter((c: CategoryResponse) => c.isEnabled), [allCategories]);
    const categoryTree = useMemo(() => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[], [categories, t]);

    const [state, dispatchLocal] = useReducer(reducer, defaultState);

    useEffect(() => {
        if (record) {
            dispatchLocal({
                type: "INIT",
                value: {
                    id: record.id,
                    key: record.key,
                    name: record.name,
                    description: record.description,
                    value: record.value,
                    categoryIds: record.categoryIds || [],
                    year: record.year || new Date().getFullYear(),
                    month: record.month || new Date().getMonth() + 1
                }
            });
        }
    }, [record]);

    const fieldChangeHandler = (field: string, value: any) => {
        dispatchLocal({ type: "SET_FIELD", field, value });
    };

    const updateHandler = async () => {
        try {
            await updateBudget({
                id: state.id,
                key: state.key,
                name: state.name,
                description: state.description,
                value: state.value,
                categoryIds: state.categoryIds,
                year: state.year,
                month: state.month,
            }).unwrap();
            message.success(t("budgets.updated"));
            if (props.onCollapse) {
                props.onCollapse();
            }
        } catch (error) {
            message.error(parseAxiosError(error, t("budgets.updateError"), t));
        }
    };

    const deleteHandler = async () => {
        try {
            await deleteBudget({
                id: state.id,
                year: state.year,
                month: state.month,
            }).unwrap();
            message.success(t("budgets.deleted"));
            if (props.onCollapse) {
                props.onCollapse();
            }
        } catch (error) {
            message.error(parseAxiosError(error, t("budgets.deleteError"), t));
        }
    };

    return (
        <Form layout="vertical">
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("budgets.name")}>
                        <Input
                            size="large"
                            value={state.name}
                            onChange={(e) => fieldChangeHandler("name", e.target.value)}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("budgets.description")}>
                        <Input
                            size="large"
                            value={state.description}
                            onChange={(e) => fieldChangeHandler("description", e.target.value)}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col xs={24} sm={12}>
                    <Form.Item label={t("budgets.categories")}>
                        <Dropdown
                            id="categories"
                            selection={categories.filter((c: any) => state.categoryIds.includes(c.id))}
                            placeholder={t("budgets.selectCategories")}
                            onChange={(item: any) => {
                                const categoryIds = state.categoryIds.includes(+item.key)
                                    ? state.categoryIds.filter((id: number) => id !== +item.key)
                                    : [...state.categoryIds, +item.key];
                                fieldChangeHandler("categoryIds", categoryIds);
                            }}
                            items={categoryTree}
                            multiple={true}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label={t("budgets.amount")}>
                        <ExpressionInputNumber
                            size="large"
                            style={{ width: '100%' }}
                            value={state.value}
                            onChange={(val) => fieldChangeHandler("value", val)}
                            precision={2}
                            placeholder="0.00"
                            addonAfter={currency}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label={t("budgets.year")}>
                        <InputNumber
                            size="large"
                            style={{ width: '100%' }}
                            value={state.year}
                            onChange={(val) => fieldChangeHandler("year", val)}
                            min={2020}
                            max={2030}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label={t("budgets.month")}>
                        <InputNumber
                            size="large"
                            style={{ width: '100%' }}
                            value={state.month}
                            onChange={(val) => fieldChangeHandler("month", val)}
                            min={1}
                            max={12}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Divider />

            <Row>
                <Col span={12}>
                    <Popconfirm
                        title={t("budgets.deleteConfirm")}
                        onConfirm={deleteHandler}
                        okText={t("common.yes")}
                        cancelText={t("common.no")}
                    >
                        <Button danger icon={<DeleteOutlined />}>
                            {t("budgets.delete")}
                        </Button>
                    </Popconfirm>
                </Col>
                <Col span={12} style={{ textAlign: "right" }}>
                    <Button
                        type="primary"
                        onClick={updateHandler}
                        loading={isUpdating}
                        disabled={!state.hasActiveChanges}
                    >
                        {t("budgets.save")}
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};

export default BudgetEditForm;
