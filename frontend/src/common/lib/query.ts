import { isApiError } from "@/core/api";

/** A 4xx will not change on a second attempt, so only other failures retry. */
export const retryUnlessClientError = (failureCount: number, error: unknown) =>
  !(isApiError(error) && error.status >= 400 && error.status < 500) &&
  failureCount < 1;

export const isNotFound = (error: unknown) =>
  isApiError(error) && error.status === 404;

/** A positive integer id from the address, or `null` when it is malformed. */
export const parseId = (raw: string | undefined): number | null =>
  raw && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
