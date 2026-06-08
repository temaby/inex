import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Form, Input, Select } from "antd";
import { CategoryResponse, useCreateCategoryMutation, useGetCategoriesQuery } from "../../store/categories/categories-api";
import { isSystemCategory } from "./categories.utils";

interface CategoryCreateFormProps {
    onCancel: () => void;
    onCreated: () => void;
    onError?: () => void;
}

const CategoryCreateForm = ({ onCancel, onCreated, onError }: CategoryCreateFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");

    // Only active, non-system, root-level categories can be parents (1 level of nesting)
    const parentOptions = useMemo(() =>
        allCategories.filter(
            c => c.isEnabled && !isSystemCategory(c) && (c.parentId === null || c.parentId === undefined)
        ),
        [allCategories]
    );

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${Date.now()}`;

    const onFinish = async (values: {
        name: string;
        description?: string;
        isEnabled: boolean;
        parentId?: number;
    }) => {
        try {
            await createCategory({
                key: toKey(values.name),
                name: values.name,
                description: values.description ?? "",
                isEnabled: values.isEnabled,
                parentId: values.parentId ?? null,
            }).unwrap();
            form.resetFields();
            onCreated();
        } catch {
            onError?.();
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            className="category-create-form"
            onFinish={onFinish}
            initialValues={{ isEnabled: true }}>
            <Form.Item
                name="name"
                label={t("categories.name")}
                rules={[{ required: true, message: t("errors.name.required") }]}>
                <Input size="large" placeholder={t("categories.namePlaceholder")} />
            </Form.Item>
            <Form.Item name="parentId" label={t("categories.parentCategory")}>
                <Select
                    size="large"
                    allowClear
                    placeholder={t("categories.parentCategoryPlaceholder")}
                    options={parentOptions.map((c: CategoryResponse) => ({ value: c.id, label: c.name }))}
                />
            </Form.Item>
            <Form.Item name="description" label={t("categories.description")}>
                <Input size="large" placeholder={t("categories.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item name="isEnabled" valuePropName="checked" className="category-create-form__active">
                <Checkbox>{t("categories.active")}</Checkbox>
            </Form.Item>
            <Form.Item className="category-create-form__footer">
                <Button
                    size="large"
                    onClick={onCancel}
                    disabled={isCreating}
                >
                    {t("common.cancel")}
                </Button>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isCreating}>
                    {t("common.create")}
                </Button>
            </Form.Item>
        </Form>
    );
};

export default CategoryCreateForm;
