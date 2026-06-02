import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Radio, Select } from "antd";
import { CategoryResponse, useCreateCategoryMutation, useGetCategoriesQuery } from "../../store/categories/categories-api";

interface CategoryCreateFormProps {
    onCreated: () => void;
}

const CategoryCreateForm = ({ onCreated }: CategoryCreateFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");

    // Only active, non-system, root-level categories can be parents (1 level of nesting)
    const parentOptions = useMemo(() =>
        allCategories.filter(
            c => c.isEnabled && !c.isSystem && (c.parentId === null || c.parentId === undefined)
        ),
        [allCategories]
    );

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const onFinish = async (values: {
        name: string;
        description?: string;
        isEnabled: boolean;
        parentId?: number;
    }) => {
        await createCategory({
            key: toKey(values.name),
            name: values.name,
            description: values.description ?? "",
            isEnabled: values.isEnabled,
            parentId: values.parentId ?? null,
        }).unwrap();
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
                    options={parentOptions.map((c: CategoryResponse) => ({ value: c.id, label: c.name }))}
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
