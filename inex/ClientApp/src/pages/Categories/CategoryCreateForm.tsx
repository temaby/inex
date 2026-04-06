import * as React from "react";
import { Form, Input, Button, Radio } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { createCategory } from "../../store/categories/categories-actions";

interface CategoryCreateFormProps {
    onCreated: () => void;
}

const CategoryCreateForm = ({ onCreated }: CategoryCreateFormProps) => {
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const isCreating = useSelector((state: any) => state.categories.isCreating);

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const onFinish = async (values: any) => {
        await dispatch(createCategory(toKey(values.name), values.name, values.description ?? "", values.isEnabled));
        form.resetFields();
        onCreated();
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ isEnabled: true }}>
            <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Name is required" }]}>
                <Input size="large" placeholder="Category name" />
            </Form.Item>
            <Form.Item name="description" label="Description">
                <Input size="large" placeholder="Optional description" />
            </Form.Item>
            <Form.Item name="isEnabled" label="Status">
                <Radio.Group buttonStyle="solid">
                    <Radio.Button value={true}>Active</Radio.Button>
                    <Radio.Button value={false}>Disabled</Radio.Button>
                </Radio.Group>
            </Form.Item>
            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isCreating}
                    block>
                    Create Category
                </Button>
            </Form.Item>
        </Form>
    );
};

export default CategoryCreateForm;
