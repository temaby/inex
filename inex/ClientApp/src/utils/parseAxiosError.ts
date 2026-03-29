import axios from "axios";

/**
 * Extracts a human-readable message from an AxiosError response.
 * Handles RFC 7807 ProblemDetails format (the same shape as parseApiError,
 * but for axios where response.data is already a parsed object).
 */
export function parseAxiosError(error: unknown, defaultMessage: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const problem = error.response.data as Record<string, unknown>;
    // 422 ValidationProblemDetails — flatten field errors
    if (problem.errors && typeof problem.errors === "object") {
      const fieldErrors = Object.values(problem.errors as Record<string, string[]>)
        .flat()
        .join("; ");
      if (fieldErrors) return fieldErrors;
    }
    if (typeof problem.detail === "string") return problem.detail;
    if (typeof problem.title === "string") return problem.title;
  }
  return error instanceof Error ? error.message : defaultMessage;
}
