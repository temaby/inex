export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  /** Present on 422 ValidationProblemDetails */
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

/**
 * Extracts a human-readable error message from an API error response.
 * Detects RFC 7807 `application/problem+json` and prefers `detail` over `title`.
 * Falls back to `defaultMessage` for non-ProblemDetails responses.
 */
export async function parseApiError(
  response: Response,
  defaultMessage: string
): Promise<string> {
  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('application/problem+json')) {
    try {
      const problem: ProblemDetails = await response.json();
      // For validation errors, flatten the field errors into the message
      if (problem.errors) {
        const fieldErrors = Object.values(problem.errors).flat().join('; ');
        if (fieldErrors) return fieldErrors;
      }
      return problem.detail ?? problem.title ?? defaultMessage;
    } catch {
      // JSON parse failed — fall through to default
    }
  }
  return defaultMessage;
}
