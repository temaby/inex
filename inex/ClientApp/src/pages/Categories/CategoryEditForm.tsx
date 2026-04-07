import * as React from "react";

import { Input, Button, Space, Divider, Radio, Popconfirm } from "antd";
import { Form, Col, Row } from 'antd';
import { useEffect, useReducer } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { CategoryEditState } from "../../model/Category/CategoryEditState";

import { updateCategory, deleteCategory } from "../../store/categories/categories-actions";

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
            return { ...state, isEnabled: action.value, hasActiveChanges: state.isEnabled !== action.value };
        default:
            return defaultState;
    }
};

const CategoryEditForm = (props: any) => {
    const dispatch = useAppDispatch();

    const isUpdating = useAppSelector(state => state.categories.isUpdating);

    const [state, dispatchAction] = useReducer(reducer, defaultState);

    const { record } = props;

    useEffect(() => {
        const currentRecord: CategoryEditState = new CategoryEditState();

        currentRecord.name = record.name;
        currentRecord.description = record.description;
        currentRecord.isEnabled = record.isEnabled;

        dispatchAction({ type: "INIT", value: currentRecord });
    }, [record]);

    const setNameHandler = (item: any) => {
        dispatchAction({ type: "SET_NAME", value: item.target.value });
    };

    const setDescriptionHandler = (item: any) => {
        dispatchAction({ type: "SET_DESCRIPTION", value: item.target.value });
    };

    const setEnabledHandler = (e: any) => {
        dispatchAction({ type: "SET_ENABLED", value: e.target.value });
    };

    const updateCategoryHandler = async () => {
        dispatch(updateCategory(+props.record.id, state.name, state.description, state.isEnabled));
    };

    const deleteCategoryHandler = async () => {
        dispatch(deleteCategory(+props.record.id));
    };

    return (
        <Form layout="vertical">
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Name">
                        <Input size="large" onChange={setNameHandler} value={state.name} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Description">
                        <Input size="large" onChange={setDescriptionHandler} value={state.description} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Divider />
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Radio.Group
                        buttonStyle="solid"
                        value={state.isEnabled}
                        onChange={setEnabledHandler}>
                        <Radio.Button value={true}>Active</Radio.Button>
                        <Radio.Button value={false}>Disabled</Radio.Button>
                    </Radio.Group>
                </Col>
                <Col span={12} style={{ textAlign: "right" }}>
                    <Space>
                        {!props.record.isSystem && (
                            <Popconfirm
                                title="Delete category? This cannot be undone."
                                onConfirm={deleteCategoryHandler}
                                okText="Delete"
                                cancelText="Cancel">
                                <Button danger>Delete</Button>
                            </Popconfirm>
                        )}
                        <Button
                            loading={isUpdating}
                            onClick={updateCategoryHandler}
                            disabled={!state.hasActiveChanges}
                            type="primary">
                            Update
                        </Button>
                    </Space>
                </Col>
            </Row>
        </Form>
    );
};

export default CategoryEditForm;
