import { apiClient } from "@/core/api";

import type { BadgeDefinition, TaskMarket } from "../types";

export const getBadges = async (
  signal?: AbortSignal
): Promise<BadgeDefinition[]> => {
  const { data } = await apiClient.get<{ items: BadgeDefinition[] }>(
    "/badges",
    { signal }
  );
  return data.items;
};

export const getTaskMarket = async (
  id: number,
  signal?: AbortSignal
): Promise<TaskMarket> => {
  const { data } = await apiClient.get<{ market: TaskMarket }>(
    `/business/tasks/${id}/market`,
    { signal }
  );
  return data.market;
};
