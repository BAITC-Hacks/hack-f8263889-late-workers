/** Shapes shared with the backend (see backend/app/schemas/common.py). */

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type OkResponse = { ok: boolean };

/** Every backend error response: `{"error": {"code", "message", "details"}}`. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    details?: unknown;
  };
};

/** What every rejected request resolves to on the client side. */
export type ApiError = {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
  details?: unknown;
  requestId?: string;
};
