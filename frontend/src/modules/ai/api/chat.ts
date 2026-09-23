/**
 * `POST /ai/chat` — one-shot completion — and `POST /ai/chat/stream` — the
 * same call as Server-Sent Events (see backend/app/services/ai.py). Both
 * routes are protected and rate-limited (429 `rate_limited` when Redis is on).
 */
import { apiClient, streamSse } from "@/core/api";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  /** Full conversation history, oldest first (at least one message). */
  messages: ChatMessage[];
  /** Overrides the backend's default system prompt. */
  system?: string;
  /** 1..128000 — the backend default applies when omitted. */
  max_tokens?: number;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
};

export type ChatResponse = {
  content: string;
  model: string;
  stop_reason: string | null;
  usage: Usage;
};

/** `delta` chunks stream first, then exactly one `done` or `error`. */
export type ChatDeltaEvent = { event: "delta"; data: { text: string } };

export type ChatDoneEvent = {
  event: "done";
  data: { model: string; stop_reason: string | null; usage: Usage };
};

/** Extra keys carry error details (e.g. `reason` / `refusal` for `ai_refusal`). */
export type ChatErrorEvent = {
  event: "error";
  data: { code: string; message: string; [key: string]: unknown };
};

export type ChatStreamEvent = ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent;

export const chat = async (request: ChatRequest): Promise<ChatResponse> => {
  const { data } = await apiClient.post<ChatResponse>("/ai/chat", request, {
    // The non-streaming route answers only once the model finishes — give it
    // more room than the client-wide 15s default.
    timeout: 120_000,
  });
  return data;
};

/**
 * Stream the reply as typed SSE events. Throws an `ApiError` when the server
 * rejects the request before any event arrives (401, 429, 502, …).
 */
export async function* chatStream(
  request: ChatRequest,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<ChatStreamEvent> {
  for await (const event of streamSse("/ai/chat/stream", request, options)) {
    // The backend only ever emits these three events (see services/ai.py).
    yield event as ChatStreamEvent;
  }
}
