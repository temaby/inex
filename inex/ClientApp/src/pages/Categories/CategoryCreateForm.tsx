import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Radio, Select } from "antd";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createCategory } from "../../store/categories/categories-actions";
import { CategoryDetails } from "../../model/Category/CategoryDetails";

interface CategoryCreateFormProps {
    onCreated: () => void;
}

const CategoryCreateForm = ({ onCreated }: CategoryCreateFormProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [form] = Form.useForm();
    const isCreating = useAppSelector(state => state.categories.isCreating);
    const allCategories = useAppSelector(state => state.categories.items);

    // Only active, non-system, root-level categories can be parents (1 level of nesting)
    const parentOptions = useMemo(() =>
        (allCategories as CategoryDetails[]).filter(
            c => c.isEnabled && !c.isSystem && (c.parentId === null || c.parentId === undefined)
        ),
        [allCategories]
    );

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const onFinish = async (values: any) => {
        await dispatch(createCategory(
            toKey(values.name),
            values.name,
            values.description ?? "",
            values.isEnabled,
            values.parentId ?? null,
        ));
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
                label={t("categories.name")}
                rules={[{ required: true, message: t("errors.name.required") }]}>
                <Input size="large" placeholder={t("categories.namePlaceholder")} />
            </Form.Item>
            <Form.Item name="description" label={t("categories.description")}>
                <Input size="large" placeholder={t("categories.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item name="parentId" label={t("categories.parentCategory")}>
                <Select
                    size="large"
                    allowClear
                    placeholder={t("categories.parentCategoryPlaceholder")}
                    options={parentOptions.map(c => ({ value: c.id, label: c.name }))}
                />
            </Form.Item>
            <Form.Item name="isEnabled" label={t("categories.status")}>
                <Radio.Group buttonStyle="solid">
                    <Radio.Button value={true}>{t("categories.active")}</Radio.Button>
                    <Radio.Button value={false}>{t("categories.disabled")}</Radio.Button>
                </Radio.Group>
            </Form.Item>
            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isCreating}
                    block>
                    {t("categories.createCategory")}
                </Button>
            </Form.Item>
        </Form>
    );
};

export default CategoryCreateForm;
