import * as React from "react";

import { Input, Button, Space, Divider, Radio } from "antd";
import { Form, Col, Row } from 'antd';
import { useEffect, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CategoryEditState } from "../../model/Category/CategoryEditState";

import { updateCategory } from "../../store/categories/categories-actions";

const defaultState: CategoryEditState = new CategoryEditState();

const reducer = (state: CategoryEditState, action: any): CategoryEditState => {
    switch (action.type) {
        case "INIT":
            return { ...state, ...action.value };
        case "SET_NAME":
            return { ...state, name: action.value, hasActiveChanges: state.name !== action.value };
        case "SET_DESCRIPTION":
            return { ...state, description: action.value, hasActiveChanges: state.description !== action.value };
        case "SET_ENABLED":
            return { ...state, isEnabled: action.value, hasActiveChanges: state.description !== action.value };
        default:
            return defaultState;
    }
};

const CategoryEditForm = (props: any) => {
    const dispatch = useDispatch();

    const isUpdating = useSelector((state: any) => state.transactions.isUpdating);

    const [state, dispatchTransactionAction] = useReducer(reducer, defaultState);

    const { record } = props;

    useEffect(() => {
        const currentRecord: CategoryEditState = new CategoryEditState();

        currentRecord.name = record.name;
        currentRecord.description = record.description;
        currentRecord.isEnabled = record.isEnabled;

        dispatchTransactionAction({ type: "INIT", value: currentRecord });
    }, [record]);

    const setNameHandler = (item: any) => {
        dispatchTransactionAction({ type: "SET_NAME", value: item.target.value });
    };

    const setDescriptionHandler = (item: any) => {
        dispatchTransactionAction({ type: "SET_DESCRIPTION", value: item.target.value });
    };

    const setEnabledHandler = (e: any) => {
        dispatchTransactionAction({ type: "SET_ENABLED", value: e.target.value });
    };

    const updateCategoryHandler = async () => {
        dispatch(updateCategory(+props.record.id, state.name, state.description, state.isEnabled));
    };

    return (
        <Form layout="vertical">
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Имя">
                        <Input key="comment" size="large" onChange={setNameHandler} value={state.name} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Описание">
                        <Input key="comment" size="large" onChange={setDescriptionHandler} value={state.description} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24} style={{ textAlign: "right" }}>
                    <Divider />
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Space>
                        <Radio.Group
                            buttonStyle="solid"
                            value={state.isEnabled}
                            onChange={setEnabledHandler}>
                            <Radio.Button value={true}>Активна</Radio.Button>
                            <Radio.Button value={false}>Отключена</Radio.Button>
                        </Radio.Group>
                    </Space>
                </Col>
                <Col span={12} style={{ textAlign: "right" }}>
                    <Space>
                        <Button loading={isUpdating} onClick={updateCategoryHandler} disabled={!state.hasActiveChanges} type="primary">
                            Сохранить
                        </Button>
                    </Space>
                </Col>
            </Row> 
        </Form>
    );
};

export default CategoryEditForm;