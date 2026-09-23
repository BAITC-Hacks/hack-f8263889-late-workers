import { apiClient } from "@/core/api";

import type {
  BusinessTask,
  ItemsResponse,
  TaskDetail,
  TaskListItem,
  TaskResponse,
  TasksPage,
  TasksQuery,
} from "../types";

export const listTasks = async (
  query: TasksQuery,
  signal?: AbortSignal
): Promise<TasksPage> => {
  const { data } = await apiClient.get<TasksPage>("/tasks", {
    params: query,
    signal,
  });
  return data;
};

export const getTask = async (
  id: number,
  signal?: AbortSignal
): Promise<TaskDetail> => {
  const { data } = await apiClient.get<TaskResponse>(`/tasks/${id}`, {
    signal,
  });
  return data.task;
};

export const saveTask = async (id: number): Promise<void> => {
  await apiClient.post(`/tasks/${id}/save`);
};

export const unsaveTask = async (id: number): Promise<void> => {
  await apiClient.delete(`/tasks/${id}/save`);
};

export const listSavedTasks = async (
  signal?: AbortSignal
): Promise<TaskListItem[]> => {
  const { data } = await apiClient.get<ItemsResponse<TaskListItem>>(
    "/me/saved-tasks",
    { signal }
  );
  return data.items;
};

export const listBusinessTasks = async (
  signal?: AbortSignal
): Promise<BusinessTask[]> => {
  const { data } = await apiClient.get<ItemsResponse<BusinessTask>>(
    "/business/tasks",
    { signal }
  );
  return data.items;
};
