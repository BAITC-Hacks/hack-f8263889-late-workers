import type { ApiError, ApiErrorBody } from "./types";

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_error",
  429: "rate_limited",
  500: "internal_error",
  502: "upstream_error",
};

const hasErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === "object" &&
  body !== null &&
  "error" in body &&
  typeof (body as ApiErrorBody).error?.message === "string";

/** Build an ApiError from an HTTP status + whatever the server sent back. */
export const toApiError = (
  status: number,
  body: unknown,
  fallbackMessage: string,
  requestId?: string
): ApiError => {
  if (hasErrorBody(body)) {
    const { code, message, details } = body.error;
    return { status, code, message, details, requestId };
  }
  return {
    status,
    code: STATUS_CODES[status] ?? "http_error",
    message: fallbackMessage,
    requestId,
  };
};

export const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ApiError).status === "number" &&
  typeof (value as ApiError).code === "string" &&
  typeof (value as ApiError).message === "string";

/** Human-readable message for any thrown value — use in UI error states. */
export const getErrorMessage = (error: unknown, fallback = "Unknown error") => {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

type ValidationIssue = { loc?: unknown[]; msg?: string };

/**
 * Field → message map from a 422 `validation_error`. FastAPI reports each issue
 * as `{loc: ["body", "email"], msg: "..."}`; the first non-"body" segment is the
 * field name, which matches react-hook-form's `setError(name, ...)`.
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (!isApiError(error) || !Array.isArray(error.details)) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details as ValidationIssue[]) {
    const loc = Array.isArray(issue.loc) ? issue.loc : [];
    const field = loc.find(
      (segment) => segment !== "body" && segment !== "query"
    );
    if (typeof field === "string" && issue.msg && !(field in result)) {
      result[field] = issue.msg;
    }
  }
  return result;
};
