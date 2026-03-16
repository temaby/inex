import * as React from "react";
import { useEffect, useReducer, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, Input, Button, Divider, Row, Col, InputNumber, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { BudgetEditState } from "../../model/Budget/BudgetEditState";
import { updateBudget, deleteBudget } from "../../store/budgets/budgets-actions";
import { getCategoriesTree, CategoryDetails } from "../../model/Category/CategoryDetails";
import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";

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
    const dispatch = useDispatch();
    const { record, currency } = props;
    
    const isUpdating = useSelector((state: any) => state.budgets.isUpdating);
    const allCategories = useSelector((state: any) => state.categories?.items || []);
    const categories = useMemo(() => allCategories.filter((c: any) => c.isEnabled), [allCategories]);
    const categoryTree = useMemo(() => getCategoriesTree(categories, false) as CategoryDetails[], [categories]);

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
            await dispatch(updateBudget(
                state.id,
                state.key,
                state.name,
                state.description,
                state.value,
                state.categoryIds,
                state.year,
                state.month
            ) as any);
            message.success("Бюджет успешно обновлен");
            if (props.onCollapse) {
                props.onCollapse();
            }
        } catch (error) {
            message.error((error as Error).message || "Ошибка при обновлении бюджета");
        }
    };

    const deleteHandler = async () => {
        try {
            await dispatch(deleteBudget(state.id) as any);
            message.success("Бюджет успешно удален");
            if (props.onCollapse) {
                props.onCollapse();
            }
        } catch (error) {
            message.error((error as Error).message || "Ошибка при удалении бюджета");
        }
    };

    return (
        <Form layout="vertical">
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Название">
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
                    <Form.Item label="Описание">
                        <Input 
                            size="large"
                            value={state.description} 
                            onChange={(e) => fieldChangeHandler("description", e.target.value)} 
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Form.Item label="Категории">
                        <Dropdown 
                            id="categories" 
                            selection={categories.filter((c: any) => state.categoryIds.includes(c.id))} 
                            placeholder="Выберите категории"
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
                <Col span={6}>
                    <Form.Item label="Сумма">
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
                <Col span={6}>
                    <Form.Item label="Год">
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
                <Col span={6}>
                    <Form.Item label="Месяц">
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
                        title="Вы уверены, что хотите удалить этот бюджет?"
                        onConfirm={deleteHandler}
                        okText="Да"
                        cancelText="Нет"
                    >
                        <Button danger icon={<DeleteOutlined />}>
                            Удалить
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
                        Сохранить
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};

export default BudgetEditForm;
