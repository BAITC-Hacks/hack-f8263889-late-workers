/**
 * Server-Sent Events over `fetch` (axios can't stream in the browser).
 * Mirrors the backend contract: `event: <name>\ndata: <json>\n\n`.
 */
import { API_V1_URL } from "./client";
import { toApiError } from "./errors";
import { tokenStorage } from "./token";
import type { ApiError } from "./types";

export type SseEvent<T = unknown> = { event: string; data: T };

type StreamOptions = {
  signal?: AbortSignal;
  skipAuth?: boolean;
};

const parseData = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/** Parse one `\n\n`-terminated block into an event (null for comments/keep-alives). */
const parseBlock = (block: string): SseEvent | null => {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  return { event, data: parseData(data.join("\n")) };
};

/**
 * POST `body` to `${API_V1_URL}${path}` and yield SSE events as they arrive.
 * Throws an `ApiError` if the server answers with a non-2xx status.
 */
export async function* streamSse<T = unknown>(
  path: string,
  body: unknown,
  { signal, skipAuth }: StreamOptions = {}
): AsyncGenerator<SseEvent<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  const token = skipAuth ? null : tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_V1_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) {
      throw {
        status: 0,
        code: "canceled",
        message: "Request canceled",
      } satisfies ApiError;
    }
    throw {
      status: 0,
      code: "network_error",
      message: "Cannot reach the API",
    } satisfies ApiError;
  }

  if (!response.ok) {
    const text = await response.text();
    const apiError = toApiError(
      response.status,
      parseData(text),
      response.statusText || "Request failed",
      response.headers.get("x-request-id") ?? undefined
    );
    if (apiError.status === 401 && !skipAuth) tokenStorage.clear();
    throw apiError;
  }

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseBlock(block);
        if (parsed) yield parsed as SseEvent<T>;
        boundary = buffer.indexOf("\n\n");
      }
    }
    // A final block without a trailing blank line.
    const tail = parseBlock(buffer + decoder.decode());
    if (tail) yield tail as SseEvent<T>;
  } finally {
    reader.releaseLock();
  }
}
