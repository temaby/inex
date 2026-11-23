import * as React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";

interface TransactionDiscardDialogProps {
    open: boolean;
    onDiscard: () => void;
    onKeepEditing: () => void;
}

const TransactionDiscardDialog = ({ open, onDiscard, onKeepEditing }: TransactionDiscardDialogProps) => {
    const { t } = useTranslation();
    return (
        <Modal
            cancelText={t("transactions.keepEditing")}
            okButtonProps={{ danger: true }}
            okText={t("transactions.discardChanges")}
            onCancel={onKeepEditing}
            onOk={onDiscard}
            open={open}
            title={t("transactions.discardConfirm")}
        />
    );
};

export default TransactionDiscardDialog;
