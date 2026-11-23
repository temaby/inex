import * as React from "react";
import { Button, DatePicker, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import enDate from "antd/es/date-picker/locale/en_US";
import ruDate from "antd/es/date-picker/locale/ru_RU";
import { useTranslation } from "react-i18next";

import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import TransactionCommentInput from "./TransactionCommentInput";

export function CreationAmount({ currency, value, onChange, onAmountDraftChange, id, editing = false }: {
    currency?: string;
    value: number;
    onChange: (value: number | null) => void;
    onAmountDraftChange?: (id: string, incomplete: boolean) => void;
    id: string;
    editing?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n?.resolvedLanguage ?? i18n?.language ?? "en";
    const previousCurrency = React.useRef(currency);
    const [changedCurrency, setChangedCurrency] = React.useState<string>();
    React.useEffect(() => {
        if (previousCurrency.current && currency && currency !== previousCurrency.current && value !== 0) {
            setChangedCurrency(currency);
        } else if (currency !== previousCurrency.current) {
            setChangedCurrency(undefined);
        }
        previousCurrency.current = currency;
    }, [currency, value]);
    return <div className="transaction-creation-amount">
        <ExpressionInputNumber id={id} creation={!editing} locale={locale} addonAfter={currency}
            value={value} onChange={onChange} onIncompleteChange={incomplete => onAmountDraftChange?.(id, incomplete)} precision={2}
            placeholder={new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(0)} />
        <div className="transaction-currency-feedback" role="status" aria-live="polite">
            {changedCurrency && t("transactions.currencyChanged", { currency: changedCurrency })}
        </div>
    </div>;
}

export function CreationDate({ date, onChange, error }: {
    date: Dayjs | null; onChange: (date: Dayjs | null) => void; error?: string;
}) {
    const { t, i18n } = useTranslation();
    const [editing, setEditing] = React.useState(false);
    const dateId = `transaction-date-${React.useId().replace(/:/g, "")}`;
    const trigger = React.useRef<HTMLButtonElement>(null);
    const restoreFocus = React.useRef(false);
    React.useEffect(() => {
        if (!editing && restoreFocus.current) {
            trigger.current?.focus();
            restoreFocus.current = false;
        }
    }, [editing]);
    const locale = i18n?.resolvedLanguage ?? i18n?.language ?? "en";
    const formatted = date ? new Intl.DateTimeFormat(locale, {
        day: "numeric", month: "long", ...(date.year() !== dayjs().year() ? { year: "numeric" } : {}),
    }).format(date.toDate()) : t("transactions.selectDate");
    const label = date?.isSame(dayjs(), "day") ? t("transactions.todayDate", { date: formatted }) : formatted;
    return <Form.Item help={error} htmlFor={dateId} label={t("transactions.date")} required validateStatus={error ? "error" : undefined}>
        <div className="transaction-creation-date" onKeyDownCapture={event => {
            if (editing && event.key === "Escape") {
                event.preventDefault(); event.stopPropagation(); restoreFocus.current = true; setEditing(false);
            }
        }}>
            {editing || error ? <DatePicker autoFocus id={dateId} open={editing} value={date}
                locale={locale.startsWith("ru") ? ruDate : enDate}
                aria-label={t("transactions.date")}
                onOpenChange={setEditing}
                onChange={value => {
                    onChange(value);
                    if (value) { restoreFocus.current = true; setEditing(false); }
                }}
                getPopupContainer={trigger => trigger.closest<HTMLElement>(".ant-drawer-content") ?? document.body}
            /> : <Button aria-label={label} id={dateId} ref={trigger} onClick={() => setEditing(true)}>{label}</Button>}
            {!editing && !error && <Button type="link" onClick={() => setEditing(true)}>{t("transactions.editDate")}</Button>}
        </div>
    </Form.Item>;
}

export function CreationComment({ comment, onChange, required = false, error }: {
    comment: string; onChange: React.ChangeEventHandler<HTMLInputElement>; required?: boolean; error?: string;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = React.useState(Boolean(comment) || required);
    const inputId = `transaction-comment-${React.useId().replace(/:/g, "")}`;
    return <Form.Item help={error} htmlFor={required ? inputId : undefined} validateStatus={error ? "error" : undefined}
        label={required ? t("transactions.correctionReason") : undefined} required={required}>
        {!required && <Button type="text" className="transaction-comment-toggle" aria-expanded={expanded}
            aria-controls={inputId} onClick={() => setExpanded(value => !value)}>
            {t(expanded ? "transactions.hideComment" : "transactions.addComment")}
        </Button>}
        {(expanded || required) && <TransactionCommentInput id={inputId} aria-label={t(required ? "transactions.correctionReason" : "transactions.comment")}
            maxLength={required ? 255 : undefined} onChange={onChange}
            placeholder={t("transactions.shortCommentPlaceholder")} value={comment} />}
    </Form.Item>;
}
