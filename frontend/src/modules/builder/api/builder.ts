import { type ApiError, apiClient, isApiError } from "@/core/api";
import type { AxiosResponse } from "axios";

import type {
  AnswerInput,
  BuilderTask,
  BuilderTaskResponse,
  CardInput,
  CreateTaskInput,
} from "../types";

/** These requests wait for the AI, which the server allows 30 s per call. */
const AI_TIMEOUT_MS = 45_000;

const timeoutError = (): ApiError => ({
  status: 0,
  code: "TIMEOUT",
  message: "Сервер не ответил. Попробуйте ещё раз",
});

const unwrap = ({ data }: AxiosResponse<BuilderTaskResponse>) => data.task;

/** The API client reports its own timeout as `timeout`; the builder contract calls it `TIMEOUT`. */
const aiRequest = async (
  request: Promise<AxiosResponse<BuilderTaskResponse>>
): Promise<BuilderTask> => {
  try {
    return unwrap(await request);
  } catch (error) {
    throw isApiError(error) && error.code === "timeout"
      ? timeoutError()
      : error;
  }
};

const taskPath = (id: number) => `/business/tasks/${id}`;

export const createTask = async (input: CreateTaskInput) =>
  unwrap(await apiClient.post<BuilderTaskResponse>("/business/tasks", input));

export const getBuilderTask = async (id: number, signal?: AbortSignal) =>
  unwrap(await apiClient.get<BuilderTaskResponse>(taskPath(id), { signal }));

export const createRound = (id: number) =>
  aiRequest(
    apiClient.post<BuilderTaskResponse>(`${taskPath(id)}/rounds`, undefined, {
      timeout: AI_TIMEOUT_MS,
    })
  );

export const saveAnswers = async (
  id: number,
  round: number,
  answers: AnswerInput[]
) =>
  unwrap(
    await apiClient.put<BuilderTaskResponse>(
      `${taskPath(id)}/rounds/${round}/answers`,
      { answers }
    )
  );

export const buildCard = (id: number) =>
  aiRequest(
    apiClient.post<BuilderTaskResponse>(
      `${taskPath(id)}/card/build`,
      undefined,
      { timeout: AI_TIMEOUT_MS }
    )
  );

export const confirmCard = (id: number, input: CardInput) =>
  aiRequest(
    apiClient.put<BuilderTaskResponse>(`${taskPath(id)}/card`, input, {
      timeout: AI_TIMEOUT_MS,
    })
  );

export const publishTask = async (id: number) =>
  unwrap(await apiClient.post<BuilderTaskResponse>(`${taskPath(id)}/publish`));

export const unpublishTask = async (id: number) =>
  unwrap(
    await apiClient.post<BuilderTaskResponse>(`${taskPath(id)}/unpublish`)
  );
