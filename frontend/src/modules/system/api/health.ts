import { API_URL, apiClient } from "@/core/api";

/** `GET /health` — lives at the backend root, outside `/api/v1`. */
export type Health = {
  status: "ok" | "degraded";
  version: string;
  env: "dev" | "test" | "prod";
  database: "ok" | "error";
  redis: "ok" | "error" | "disabled";
};

export const fetchHealth = async (): Promise<Health> => {
  const { data } = await apiClient.get<Health>(`${API_URL}/health`, {
    skipAuth: true,
    timeout: 5_000,
  });
  return data;
};
