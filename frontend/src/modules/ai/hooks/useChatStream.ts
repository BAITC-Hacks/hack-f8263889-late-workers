import { type ApiError, getErrorMessage, isApiError } from "@/core/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { type ChatMessage, type Usage, chatStream } from "../api/chat";

export type ChatStreamStatus = "idle" | "streaming" | "error";

type ChatStreamState = {
  /** Committed conversation — sent back as history on the next turn. */
  messages: ChatMessage[];
  /** Assistant text still streaming in — committed to `messages` on `done`. */
  draft: string;
  status: ChatStreamStatus;
  error: ApiError | null;
  /** Token counts from the last completed turn. */
  usage: Usage | null;
};

const INITIAL: ChatStreamState = {
  messages: [],
  draft: "",
  status: "idle",
  error: null,
  usage: null,
};

/**
 * Local chat session over `POST /ai/chat/stream`.
 *
 * `send(text)` appends the user message and streams the reply into `draft`;
 * `done` commits the draft as an assistant message. On an `error` event (or a
 * thrown `ApiError` — 401/429/502 before any event) the partial draft stays
 * visible next to the error until the next `send` / `reset`. `stop()` aborts
 * the stream and keeps whatever already arrived as a finished message.
 */
export const useChatStream = () => {
  const [state, setState] = useState<ChatStreamState>(INITIAL);
  // Source of truth for building requests — readable inside `send` without
  // closing over a stale state snapshot.
  const messagesRef = useRef<ChatMessage[]>([]);
  // Non-null exactly while a stream is in flight — doubles as the overlap guard.
  const controllerRef = useRef<AbortController | null>(null);

  // Abort a stream that's still running when the component unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || controllerRef.current) return; // one stream at a time

    const controller = new AbortController();
    controllerRef.current = controller;

    const history: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content },
    ];
    messagesRef.current = history;
    setState((prev) => ({
      ...prev,
      messages: history,
      draft: "",
      status: "streaming",
      error: null,
    }));

    let draft = "";
    let settled = false;
    const fail = (error: ApiError) => {
      settled = true;
      setState((prev) => ({ ...prev, status: "error", error }));
    };

    try {
      for await (const event of chatStream(
        { messages: history },
        { signal: controller.signal }
      )) {
        if (event.event === "delta") {
          draft += event.data.text;
          const current = draft;
          setState((prev) => ({ ...prev, draft: current }));
        } else if (event.event === "done") {
          settled = true;
          // A turn can finish with no text (e.g. `incomplete` after reasoning
          // spent the token budget) — the backend rejects empty content, so
          // don't commit an empty assistant message.
          messagesRef.current = draft
            ? [...history, { role: "assistant", content: draft }]
            : history;
          setState((prev) => ({
            ...prev,
            messages: messagesRef.current,
            draft: "",
            status: "idle",
            usage: event.data.usage,
          }));
        } else {
          // Mirror the thrown-ApiError shape so the UI handles both the same way.
          const { code, message, ...details } = event.data;
          fail({ status: 0, code, message, details });
        }
      }
      if (!settled) {
        fail({
          status: 0,
          code: "stream_error",
          message: "The stream ended before the reply finished",
        });
      }
    } catch (error) {
      if (controllerRef.current !== controller) return; // reset() already cleaned up
      if (controller.signal.aborted) {
        // stop() — keep whatever already streamed in as a finished message.
        if (draft) {
          messagesRef.current = [
            ...history,
            { role: "assistant", content: draft },
          ];
        }
        setState((prev) => ({
          ...prev,
          messages: messagesRef.current,
          draft: "",
          status: "idle",
        }));
      } else {
        fail(
          isApiError(error)
            ? error
            : {
                status: 0,
                code: "stream_error",
                message: getErrorMessage(error, "The stream failed"),
              }
        );
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  /** Abort the in-flight stream (no-op when idle). */
  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  /** Drop the whole session: abort, clear messages, draft, error and usage. */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    messagesRef.current = [];
    setState(INITIAL);
  }, []);

  return { ...state, send, stop, reset };
};
