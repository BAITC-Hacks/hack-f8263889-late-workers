import { type ApiError } from "@/core/api";
import { useMutation } from "@tanstack/react-query";

import { type ChatRequest, type ChatResponse, chat } from "../api/chat";

/** One-shot (non-streaming) completion. For live output use `useChatStream`. */
export const useChat = () =>
  useMutation<ChatResponse, ApiError, ChatRequest>({ mutationFn: chat });
