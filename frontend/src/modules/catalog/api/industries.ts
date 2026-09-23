import { apiClient } from "@/core/api";

import type { Industry, ItemsResponse } from "../types";

export const listIndustries = async (
  signal?: AbortSignal
): Promise<Industry[]> => {
  const { data } = await apiClient.get<ItemsResponse<Industry>>("/industries", {
    signal,
  });
  return data.items;
};
