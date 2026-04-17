import axios from "axios";

/**
 * Extracts a human-readable message from an AxiosError response.
 * Handles RFC 7807 ProblemDetails format (the same shape as parseApiError,
 * but for axios where response.data is already a parsed object).
 *
 * Pass the i18next `t` function to translate validation error codes
 * (e.g. "amount.not_zero" → "Amount cannot be zero").
 */
export function parseAxiosError(
  error: unknown,
  defaultMessage: string,
  t?: (key: string) => string
): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const problem = error.response.data as Record<string, unknown>;
    // 422 ValidationProblemDetails — flatten and optionally translate field errors
    if (problem.errors && typeof problem.errors === "object") {
      const translate = (code: string) => {
        if (!t) return code;
        const key = `errors.${code}`;
        const result = t(key);
        // i18next returns the key unchanged when no translation exists
        return result !== key ? result : code;
      };
      const fieldErrors = Object.values(problem.errors as Record<string, string[]>)
        .flat()
        .map(translate)
        .join("; ");
      if (fieldErrors) return fieldErrors;
    }
    if (typeof problem.detail === "string") return problem.detail;
    if (typeof problem.title === "string") return problem.title;
  }
  return error instanceof Error ? error.message : defaultMessage;
}
