import * as React from "react";
import { Alert, Button, Form, Input, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import { CheckCircle2, KeyRound, Languages, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import BasicPage from "../layouts/BasicPage";
import { changePassword, updateProfile } from "../store/auth/auth-actions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import apiClient from "../utils/apiClient";
import { parseAxiosError } from "../utils/parseAxiosError";
import "./Profile.css";

interface Currency {
    id: number;
    key: string;
    name: string;
}

interface ProfileFormValues {
    username: string;
    currencyId: number;
    languageCode: string | null;
}

interface PasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

type SettingsSection = "account" | "security";
type FieldMap<T> = Record<string, keyof T>;
type FieldError<T> = {
    name: keyof T;
    message: string;
};
type ValidationEntry = {
    source?: string;
    messages: string[];
};

const passwordRules = {
    minLength: 8,
    strongLength: 12,
};

const getPasswordStrength = (password?: string) => {
    if (!password) return 0;

    const tests = [
        password.length >= passwordRules.minLength,
        password.length >= passwordRules.strongLength,
        /[a-z]/.test(password) && /[A-Z]/.test(password),
        /\d/.test(password),
        /[^a-zA-Z0-9]/.test(password),
    ];

    return tests.filter(Boolean).length;
};

const getStrengthKey = (score: number) => {
    if (score >= 4) return "profile.security.strength.strong";
    if (score >= 2) return "profile.security.strength.medium";
    return "profile.security.strength.weak";
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null
);

const normalizeValidationKey = (key: string) => key.replace(/[^a-z0-9]/gi, "").toLowerCase();
const isValidationCode = (message: string) => /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(message);

const getErrorData = (error: unknown) => {
    if (!isRecord(error)) return null;

    const response = error.response;
    if (isRecord(response) && "data" in response) return response.data;
    if ("data" in error) return error.data;
    return null;
};

const getValidationEntries = (error: unknown): ValidationEntry[] => {
    const data = getErrorData(error);
    if (!isRecord(data) || !("errors" in data)) return [];

    const { errors } = data;
    if (Array.isArray(errors)) {
        return [{
            messages: errors.filter((message): message is string => typeof message === "string"),
        }];
    }

    if (!isRecord(errors)) return [];

    return Object.entries(errors).map(([source, value]) => {
        if (Array.isArray(value)) {
            return {
                source,
                messages: value.filter((message): message is string => typeof message === "string"),
            };
        }

        return {
            source,
            messages: typeof value === "string" ? [value] : [],
        };
    });
};

const resolveFieldName = <T extends object>(
    source: string | undefined,
    message: string,
    fieldMap: FieldMap<T>,
) => {
    const candidates = [
        source,
        message.split(".")[0],
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
        const fieldName = fieldMap[normalizeValidationKey(candidate)];
        if (fieldName) return fieldName;
    }

    return null;
};

const Profile = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const [profileForm] = Form.useForm<ProfileFormValues>();
    const [passwordForm] = Form.useForm<PasswordFormValues>();
    const selectedCurrencyId = Form.useWatch("currencyId", profileForm);
    const selectedLanguageCode = Form.useWatch("languageCode", profileForm);
    const newPassword = Form.useWatch("newPassword", passwordForm);

    const [activeSection, setActiveSection] = React.useState<SettingsSection>("account");
    const [currencies, setCurrencies] = React.useState<Currency[]>([]);
    const [currenciesError, setCurrenciesError] = React.useState<string | null>(null);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = React.useState(true);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const [isSavingPassword, setIsSavingPassword] = React.useState(false);
    const [profileApiError, setProfileApiError] = React.useState<string | null>(null);
    const [passwordApiError, setPasswordApiError] = React.useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);

    const accountSectionRef = React.useRef<HTMLElement | null>(null);
    const securitySectionRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        setIsLoadingCurrencies(true);
        apiClient.get<Currency[]>("/currencies")
            .then(({ data }) => {
                if (!cancelled) {
                    setCurrencies(data);
                    setCurrenciesError(null);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setCurrencies([]);
                    setCurrenciesError(parseAxiosError(error, t("profile.errors.currencyLoadFailed"), t));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingCurrencies(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [t]);

    React.useEffect(() => {
        if (!user) return;

        profileForm.setFieldsValue({
            username: user.username,
            currencyId: user.currencyId,
            languageCode: user.languageCode ?? "en",
        });
    }, [profileForm, user]);

    const currentCurrency = React.useMemo(
        () => currencies.find((currency) => currency.id === user?.currencyId) ?? null,
        [currencies, user?.currencyId],
    );
    const selectedCurrency = React.useMemo(
        () => currencies.find((currency) => currency.id === selectedCurrencyId) ?? currentCurrency,
        [currencies, currentCurrency, selectedCurrencyId],
    );

    const passwordStrength = getPasswordStrength(newPassword);
    const passwordStrengthPercent = Math.max(12, (passwordStrength / 5) * 100);

    const navigateToSection = (section: SettingsSection) => {
        setActiveSection(section);
        const target = section === "account" ? accountSectionRef.current : securitySectionRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const translateValidationCode = (code: string) => t(`errors.${code}`);

    const resolveProfileDomainError = (message: string): FieldError<ProfileFormValues> | null => {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("username") || normalizedMessage.includes("user name")) {
            return {
                name: "username",
                message: t("profile.errors.usernameRejected"),
            };
        }

        if (normalizedMessage.includes("currency")) {
            return {
                name: "currencyId",
                message: t("errors.currency_id.invalid"),
            };
        }

        if (normalizedMessage.includes("language")) {
            return {
                name: "languageCode",
                message: t("errors.language_code.invalid"),
            };
        }

        return null;
    };

    const resolvePasswordDomainError = (message: string): FieldError<PasswordFormValues> | null => {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("incorrect password") || normalizedMessage.includes("current password")) {
            return {
                name: "currentPassword",
                message: t("profile.errors.currentPasswordIncorrect"),
            };
        }

        if (normalizedMessage.includes("password")) {
            return {
                name: "newPassword",
                message: t("profile.errors.newPasswordRejected"),
            };
        }

        return null;
    };

    const applyApiValidationErrors = <T extends object>(
        form: FormInstance<T>,
        error: unknown,
        fieldMap: FieldMap<T>,
        resolveDomainError: (message: string) => FieldError<T> | null,
    ) => {
        const entries = getValidationEntries(error);
        const fieldErrors = new Map<keyof T, string[]>();

        for (const entry of entries) {
            for (const message of entry.messages) {
                const fieldName = resolveFieldName(entry.source, message, fieldMap);
                const domainError = isValidationCode(message) ? null : resolveDomainError(message);
                const resolvedField = fieldName ?? domainError?.name;

                if (!resolvedField) continue;

                const translatedMessage = domainError?.message ?? translateValidationCode(message);
                const currentErrors = fieldErrors.get(resolvedField) ?? [];
                currentErrors.push(translatedMessage);
                fieldErrors.set(resolvedField, currentErrors);
            }
        }

        if (fieldErrors.size === 0) return false;

        const formFields = Array.from(fieldErrors.entries()).map(([name, errors]) => ({
            name: [name as string],
            errors,
        })) as Parameters<FormInstance<T>["setFields"]>[0];

        form.setFields(formFields);
        return true;
    };

    const onProfileFinish = async (values: ProfileFormValues) => {
        setIsSavingProfile(true);
        setProfileApiError(null);
        setProfileSuccess(null);

        try {
            await dispatch(updateProfile({
                username: values.username,
                currencyId: values.currencyId,
                languageCode: values.languageCode,
            }));
            setProfileSuccess(t("profile.account.success"));
        } catch (error) {
            const didMapErrors = applyApiValidationErrors(
                profileForm,
                error,
                {
                    username: "username",
                    currencyid: "currencyId",
                    languagecode: "languageCode",
                },
                resolveProfileDomainError,
            );

            if (!didMapErrors) {
                setProfileApiError(t("profile.errors.profileUpdateFailed"));
            }
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onPasswordFinish = async (values: PasswordFormValues) => {
        setIsSavingPassword(true);
        setPasswordApiError(null);
        setPasswordSuccess(null);

        try {
            await dispatch(changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            }));
            setPasswordSuccess(t("profile.security.success"));
            passwordForm.resetFields();
        } catch (error) {
            const didMapErrors = applyApiValidationErrors(
                passwordForm,
                error,
                {
                    currentpassword: "currentPassword",
                    newpassword: "newPassword",
                    password: "newPassword",
                    confirmpassword: "confirmPassword",
                },
                resolvePasswordDomainError,
            );

            if (!didMapErrors) {
                setPasswordApiError(t("profile.errors.passwordChangeFailed"));
            }
        } finally {
            setIsSavingPassword(false);
        }
    };

    const sectionTabs = [
        {
            key: "account" as const,
            icon: <UserRound size={16} aria-hidden="true" />,
            label: t("profile.tabs.account"),
            panelId: "profile-account-panel",
        },
        {
            key: "security" as const,
            icon: <KeyRound size={16} aria-hidden="true" />,
            label: t("profile.tabs.security"),
            panelId: "profile-security-panel",
        },
    ];

    return (
        <BasicPage title={t("profile.title")} subtitle={t("profile.subtitle")}>
            <div className="profile-workspace">
                <aside className="profile-sidebar" aria-label={t("profile.tabs.label")}>
                    <div className="profile-sidebar__summary">
                        <span className="profile-avatar" aria-hidden="true">
                            {user?.username?.slice(0, 1).toUpperCase() ?? "U"}
                        </span>
                        <div>
                            <strong>{user?.username ?? t("profile.overview.unknownUser")}</strong>
                            <span>{user?.email ?? t("profile.overview.unknownEmail")}</span>
                        </div>
                    </div>
                    <nav className="profile-tabs" aria-label={t("profile.tabs.label")}>
                        {sectionTabs.map((section) => (
                            <button
                                aria-controls={section.panelId}
                                aria-current={activeSection === section.key ? "location" : undefined}
                                className={activeSection === section.key ? "is-active" : undefined}
                                key={section.key}
                                onClick={() => navigateToSection(section.key)}
                                type="button"
                            >
                                {section.icon}
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="profile-content">
                    <section className="profile-overview" aria-label={t("profile.overview.title")}>
                        <div className="profile-overview__intro">
                            <span className="profile-eyebrow">{t("profile.overview.eyebrow")}</span>
                            <h2>{t("profile.overview.title")}</h2>
                            <p>{t("profile.overview.description")}</p>
                        </div>
                        <div className="profile-overview__metrics">
                            <div>
                                <span>{t("profile.overview.currency")}</span>
                                <strong>{currentCurrency?.key ?? t("profile.overview.currencyUnavailable")}</strong>
                            </div>
                            <div>
                                <span>{t("profile.overview.language")}</span>
                                <strong>{t(`language.${user?.languageCode ?? "en"}`)}</strong>
                            </div>
                            <div>
                                <span>{t("profile.overview.session")}</span>
                                <strong>{t("profile.overview.protected")}</strong>
                            </div>
                        </div>
                    </section>

                    <section
                        aria-labelledby="profile-account-heading"
                        className="profile-card"
                        id="profile-account-panel"
                        ref={accountSectionRef}
                    >
                        <div className="profile-section-head">
                            <div>
                                <span className="profile-eyebrow">{t("profile.account.eyebrow")}</span>
                                <h2 id="profile-account-heading">{t("profile.account.title")}</h2>
                                <p>{t("profile.account.description")}</p>
                            </div>
                            <CheckCircle2 size={20} aria-hidden="true" />
                        </div>

                        <div className="profile-section-grid">
                            <Form
                                className="profile-form"
                                disabled={isSavingProfile}
                                form={profileForm}
                                layout="vertical"
                                onFinish={onProfileFinish}
                            >
                                {profileApiError ? (
                                    <Alert
                                        className="profile-alert"
                                        message={profileApiError}
                                        showIcon
                                        type="error"
                                    />
                                ) : null}
                                {profileSuccess ? (
                                    <Alert
                                        className="profile-alert"
                                        message={profileSuccess}
                                        showIcon
                                        type="success"
                                    />
                                ) : null}
                                {currenciesError ? (
                                    <Alert
                                        className="profile-alert"
                                        message={currenciesError}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}

                                <Form.Item htmlFor="profile-email" label={t("auth.email")}>
                                    <Input id="profile-email" size="large" value={user?.email ?? ""} disabled />
                                </Form.Item>
                                <Form.Item
                                    name="username"
                                    label={t("auth.username")}
                                    rules={[{ required: true, message: t("profile.validation.usernameRequired") }]}
                                >
                                    <Input size="large" autoComplete="username" />
                                </Form.Item>
                                <Form.Item
                                    name="currencyId"
                                    label={t("common.currency")}
                                    rules={[{ required: true, message: t("profile.validation.currencyRequired") }]}
                                >
                                    <Select
                                        loading={isLoadingCurrencies}
                                        optionFilterProp="label"
                                        options={currencies.map((currency) => ({
                                            value: currency.id,
                                            label: `${currency.key} - ${currency.name}`,
                                        }))}
                                        showSearch
                                        size="large"
                                    />
                                </Form.Item>
                                <Form.Item name="languageCode" label={t("auth.language")}>
                                    <Select
                                        options={[
                                            { value: "en", label: t("language.en") },
                                            { value: "ru", label: t("language.ru") },
                                        ]}
                                        size="large"
                                    />
                                </Form.Item>
                                <Button
                                    block
                                    htmlType="submit"
                                    loading={isSavingProfile}
                                    size="large"
                                    type="primary"
                                >
                                    {t("profile.account.save")}
                                </Button>
                            </Form>

                            <div className="profile-help-panel">
                                <Languages size={20} aria-hidden="true" />
                                <h3>{t("profile.account.helpTitle")}</h3>
                                <p>{t("profile.account.helpDescription")}</p>
                                <dl>
                                    <div>
                                        <dt>{t("profile.account.savedLanguage")}</dt>
                                        <dd>{t(`language.${selectedLanguageCode ?? user?.languageCode ?? "en"}`)}</dd>
                                    </div>
                                    <div>
                                        <dt>{t("profile.account.savedCurrency")}</dt>
                                        <dd>{selectedCurrency ? `${selectedCurrency.key} - ${selectedCurrency.name}` : t("profile.overview.currencyUnavailable")}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </section>

                    <section
                        aria-labelledby="profile-security-heading"
                        className="profile-card"
                        id="profile-security-panel"
                        ref={securitySectionRef}
                    >
                        <div className="profile-section-head">
                            <div>
                                <span className="profile-eyebrow">{t("profile.security.eyebrow")}</span>
                                <h2 id="profile-security-heading">{t("profile.security.title")}</h2>
                                <p>{t("profile.security.description")}</p>
                            </div>
                            <ShieldCheck size={20} aria-hidden="true" />
                        </div>

                        <div className="profile-section-grid">
                            <Form
                                className="profile-form"
                                disabled={isSavingPassword}
                                form={passwordForm}
                                layout="vertical"
                                onFinish={onPasswordFinish}
                            >
                                {passwordApiError ? (
                                    <Alert
                                        className="profile-alert"
                                        message={passwordApiError}
                                        showIcon
                                        type="error"
                                    />
                                ) : null}
                                {passwordSuccess ? (
                                    <Alert
                                        className="profile-alert"
                                        message={passwordSuccess}
                                        showIcon
                                        type="success"
                                    />
                                ) : null}

                                <Form.Item
                                    name="currentPassword"
                                    label={t("auth.currentPassword")}
                                    rules={[{ required: true, message: t("profile.validation.currentPasswordRequired") }]}
                                >
                                    <Input.Password
                                        autoComplete="current-password"
                                        name="currentPassword"
                                        size="large"
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label={t("auth.newPassword")}
                                    rules={[
                                        { required: true, message: t("profile.validation.newPasswordRequired") },
                                        { min: passwordRules.minLength, message: t("profile.validation.passwordMinLength") },
                                    ]}
                                >
                                    <Input.Password
                                        autoComplete="new-password"
                                        name="newPassword"
                                        size="large"
                                    />
                                </Form.Item>
                                <div className="profile-strength">
                                    <div
                                        aria-label={t("profile.security.strength.label")}
                                        aria-valuemax={5}
                                        aria-valuemin={0}
                                        aria-valuenow={passwordStrength}
                                        role="progressbar"
                                    >
                                        <span style={{ width: `${passwordStrengthPercent}%` }} />
                                    </div>
                                    <p>{t(getStrengthKey(passwordStrength))}</p>
                                </div>
                                <Form.Item
                                    name="confirmPassword"
                                    label={t("profile.security.confirmPassword")}
                                    dependencies={["newPassword"]}
                                    rules={[
                                        { required: true, message: t("profile.validation.confirmPasswordRequired") },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                                                return Promise.reject(new Error(t("profile.validation.passwordMismatch")));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password
                                        autoComplete="new-password"
                                        name="confirmPassword"
                                        size="large"
                                    />
                                </Form.Item>
                                <Button
                                    block
                                    htmlType="submit"
                                    loading={isSavingPassword}
                                    size="large"
                                    type="primary"
                                >
                                    {t("profile.security.save")}
                                </Button>
                            </Form>

                            <div className="profile-help-panel">
                                <ShieldCheck size={20} aria-hidden="true" />
                                <h3>{t("profile.security.helpTitle")}</h3>
                                <p>{t("profile.security.helpDescription")}</p>
                                <ul>
                                    <li>{t("profile.security.tipLength")}</li>
                                    <li>{t("profile.security.tipUnique")}</li>
                                    <li>{t("profile.security.tipManager")}</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </BasicPage>
    );
};

export default Profile;
