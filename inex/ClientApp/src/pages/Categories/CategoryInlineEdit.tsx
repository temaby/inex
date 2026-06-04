import * as React from "react";
import { Alert, Popconfirm } from "antd";
import { useTranslation } from "react-i18next";

import {
    Field,
    InExButton,
    Input,
    Select,
} from "../../components/primitives";
import type { CategoryResponse } from "../../store/categories/categories-api";
import {
    useDeleteCategoryMutation,
    useUpdateCategoryMutation,
} from "../../store/categories/categories-api";
import { isSystemCategory } from "./categories.utils";

interface CategoryInlineEditProps {
    category: CategoryResponse;
    allCategories: CategoryResponse[];
    onClose: () => void;
}

export const CategoryInlineEdit: React.FC<CategoryInlineEditProps> = ({
    category,
    allCategories,
    onClose,
}) => {
    const { t } = useTranslation();
    const [name, setName] = React.useState(category.name);
    const [description, setDescription] = React.useState(category.description ?? "");
    const [isEnabled, setIsEnabled] = React.useState(category.isEnabled);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
    const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
    const locked = isSystemCategory(category);

    React.useEffect(() => {
        setName(category.name);
        setDescription(category.description ?? "");
        setIsEnabled(category.isEnabled);
        setFormError(null);
    }, [category]);

    const parent = category.parentId == null
        ? null
        : allCategories.find((item) => item.id === category.parentId);

    const handleSave = async () => {
        setFormError(null);
        try {
            await updateCategory({
                id: category.id,
                key: category.key,
                name,
                description,
                isEnabled,
            }).unwrap();
            onClose();
        } catch {
            setFormError(t("categories.formErrors.updateFailed"));
        }
    };

    const handleDelete = async () => {
        setFormError(null);
        if (allCategories.some((item) => item.parentId === category.id)) {
            setFormError(t("categories.formErrors.deleteHasChildren"));
            return;
        }

        try {
            await deleteCategory(category.id).unwrap();
            onClose();
        } catch {
            setFormError(t("categories.formErrors.deleteFailed"));
        }
    };

    return (
        <div className="category-inline-edit r-category-inline-edit">
            <div className="category-inline-edit__form">
                <h3>{t("categories.inlineEdit.editSection")}</h3>
                {locked ? (
                    <Alert
                        type="info"
                        showIcon
                        message={t("categories.inlineEdit.systemNotice")}
                    />
                ) : null}
                {formError ? <Alert type="error" showIcon message={formError} /> : null}
                <Field label={t("categories.name")} required>
                    <Input
                        value={name}
                        disabled={locked}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field label={t("categories.description")}>
                    <Input
                        value={description}
                        disabled={locked}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Field>
                <Field
                    label={t("categories.parentCategory")}
                    hint={t("categories.inlineEdit.reparentNotSupported")}
                >
                    <Select value={parent?.id.toString() ?? ""} disabled>
                        <option value="">
                            {t("categories.parentCategoryPlaceholder")}
                        </option>
                        {allCategories
                            .filter((item) => item.parentId == null && !isSystemCategory(item))
                            .map((item) => (
                                <option value={item.id.toString()} key={item.id}>
                                    {item.name}
                                </option>
                            ))}
                    </Select>
                </Field>
                {!locked ? (
                    <label className="category-toggle">
                        <input
                            checked={isEnabled}
                            onChange={(event) => setIsEnabled(event.target.checked)}
                            type="checkbox"
                        />
                        <span>{t("categories.active")}</span>
                    </label>
                ) : null}
                <div className="category-inline-edit__actions">
                    <InExButton onClick={onClose}>{t("common.cancel")}</InExButton>
                    {!locked ? (
                        <React.Fragment>
                            <Popconfirm
                                title={t("categories.deleteConfirm")}
                                okText={t("categories.delete")}
                                cancelText={t("categories.cancel")}
                                onConfirm={handleDelete}
                            >
                                <span>
                                    <InExButton
                                        kind="danger"
                                        disabled={isDeleting}
                                    >
                                        {t("common.delete")}
                                    </InExButton>
                                </span>
                            </Popconfirm>
                            <InExButton
                                kind="primary"
                                disabled={isUpdating || name.trim().length === 0}
                                onClick={handleSave}
                            >
                                {t("common.save")}
                            </InExButton>
                        </React.Fragment>
                    ) : null}
                </div>
            </div>
            <aside className="category-inline-edit__snapshot">
                <h3>{t("categories.inlineEdit.snapshotSection")}</h3>
                <div className="category-snapshot-grid">
                    <div>
                        <span>{t("categories.snapshot.spend")}</span>
                        <strong>-</strong>
                    </div>
                    <div>
                        <span>{t("categories.snapshot.transactions")}</span>
                        <strong>-</strong>
                    </div>
                    <div>
                        <span>{t("categories.snapshot.budget")}</span>
                        <strong>-</strong>
                    </div>
                    <div>
                        <span>{t("categories.snapshot.categoryId")}</span>
                        <strong>{category.id}</strong>
                    </div>
                </div>
                <div className="category-inline-edit__snapshot-actions">
                    <InExButton kind="ghost" size="sm" disabled>
                        {t("categories.inlineEdit.viewTransactions")}
                    </InExButton>
                    <InExButton kind="ghost" size="sm" disabled>
                        {t("categories.inlineEdit.setBudget")}
                    </InExButton>
                </div>
            </aside>
        </div>
    );
};
