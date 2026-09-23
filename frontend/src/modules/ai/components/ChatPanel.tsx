import { Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { field, fieldError, metaLabel } from "@/common/styles";
import { getErrorMessage } from "@/core/api";
import { Send, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type ChatRole } from "../api/chat";
import { useChatStream } from "../hooks/useChatStream";

type BubbleProps = {
  role: ChatRole;
  children: React.ReactNode;
};

/** One conversation turn: role label + bubble (user right, assistant left). */
const Bubble = ({ role, children }: BubbleProps) => {
  const { t } = useTranslation();
  const isUser = role === "user";

  return (
    <li
      className={cn(
        "flex flex-col gap-1.5",
        isUser ? "items-end" : "items-start"
      )}
    >
      <span className={metaLabel}>
        {isUser ? t("ai.chat.roleUser") : t("ai.chat.roleAssistant")}
      </span>
      <div
        className={cn(
          "max-w-[60ch] rounded-md border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser ? "bg-primary/5" : "bg-muted/40"
        )}
      >
        {children}
      </div>
    </li>
  );
};

/** Streaming chat: message list, live draft, error line and a composer. */
export const ChatPanel = () => {
  const { t } = useTranslation();
  const { messages, draft, status, error, usage, send, stop, reset } =
    useChatStream();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  // False once the user scrolls up to re-read — pauses the auto-scroll below.
  const pinnedRef = useRef(true);

  const isStreaming = status === "streaming";
  const hasSession = messages.length > 0 || draft !== "" || status !== "idle";

  // Keep the newest text in view while the reply streams in — unless the
  // user scrolled away from the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (list && pinnedRef.current) list.scrollTop = list.scrollHeight;
  }, [messages, draft]);

  const submit = () => {
    const content = text.trim();
    if (!content || isStreaming) return;
    pinnedRef.current = true; // sending jumps back to the newest message
    void send(content);
    setText("");
  };

  return (
    <div className="max-w-4xl space-y-6">
      {messages.length === 0 && !isStreaming ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
          {t("ai.chat.empty")}
        </p>
      ) : (
        <ul
          ref={listRef}
          onScroll={(event) => {
            const list = event.currentTarget;
            pinnedRef.current =
              list.scrollHeight - list.scrollTop - list.clientHeight < 40;
          }}
          className="max-h-[60vh] space-y-5 overflow-y-auto pr-1"
        >
          {messages.map((message, index) => (
            <Bubble key={index} role={message.role}>
              {message.content}
            </Bubble>
          ))}
          {(isStreaming || (status === "error" && draft !== "")) && (
            <Bubble role="assistant">
              {draft}
              {isStreaming && (
                <span
                  aria-hidden
                  className="bg-foreground/60 ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle"
                />
              )}
            </Bubble>
          )}
        </ul>
      )}

      {status === "error" && error && (
        <p className={fieldError} role="alert">
          {t("ai.chat.error")} — {getErrorMessage(error)}
        </p>
      )}

      {status === "idle" && usage && (
        <p className="text-muted-foreground text-xs">
          {t("ai.chat.usage", {
            input: usage.input_tokens,
            output: usage.output_tokens,
          })}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter inserts a newline. Ignore the Enter
            // that confirms an IME composition.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("ai.chat.inputPlaceholder")}
          className={cn(field, "resize-none")}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            {t("ai.chat.inputHint")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={!hasSession}
            >
              <Trash2 />
              {t("ai.chat.clear")}
            </Button>
            {isStreaming ? (
              <Button type="button" variant="outline" size="sm" onClick={stop}>
                <Square />
                {t("ai.chat.stop")}
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={text.trim() === ""}>
                <Send />
                {t("ai.chat.send")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
