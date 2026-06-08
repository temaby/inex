type Translate = (key: string) => string;

const normalizedIncludes = (value: string, terms: string[]) => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
};

export const translateLoginError = (error: string | null, t: Translate): string | null => {
  if (!error) return null;

  if (
    normalizedIncludes(error, [
      "invalid credentials",
      "wrong credentials",
      "unauthorized",
      "incorrect email",
      "incorrect password",
    ])
  ) {
    return t("auth.errors.invalidCredentials");
  }

  if (normalizedIncludes(error, ["login failed", "network error", "request failed"])) {
    return t("auth.errors.loginFailed");
  }

  return t("auth.errors.loginFailed");
};

export const translateRegisterError = (error: string | null, t: Translate): string | null => {
  if (!error) return null;

  if (normalizedIncludes(error, ["already", "duplicate", "email exists", "email is taken"])) {
    return t("auth.errors.duplicateEmail");
  }

  if (normalizedIncludes(error, ["invite", "token", "expired"])) {
    return t("auth.errors.invalidInviteToken");
  }

  if (normalizedIncludes(error, ["registration failed", "register failed", "network error", "request failed"])) {
    return t("auth.errors.registrationFailed");
  }

  return t("auth.errors.registrationFailed");
};
