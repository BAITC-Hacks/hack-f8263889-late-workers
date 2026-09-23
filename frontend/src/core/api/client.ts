import { env } from "@/core/env";
import axios, { type AxiosError, type AxiosInstance } from "axios";

import { toApiError } from "./errors";
import { tokenStorage } from "./token";
import type { ApiError } from "./types";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Don't attach the JWT and don't treat a 401 as "session expired" (login, register, health). */
    skipAuth?: boolean;
  }
}

/** Backend origin, e.g. `http://localhost:8000`. */
export const API_URL = env.VITE_API_URL.replace(/\/+$/, "");
/** Versioned API root — `apiClient` paths are relative to this. */
export const API_V1_URL = `${API_URL}/api/v1`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_V1_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = config.skipAuth ? null : tokenStorage.get();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let normalized: ApiError;

    if (error.response) {
      const requestId = error.response.headers?.["x-request-id"] as
        string | undefined;
      normalized = toApiError(
        error.response.status,
        error.response.data,
        error.message,
        requestId
      );
      // The token was sent and rejected — drop it so the auth module logs the user out.
      if (normalized.status === 401 && !error.config?.skipAuth) {
        tokenStorage.clear();
      }
    } else if (error.code === "ECONNABORTED") {
      normalized = { status: 0, code: "timeout", message: "Request timed out" };
    } else if (error.code === "ERR_CANCELED") {
      normalized = { status: 0, code: "canceled", message: "Request canceled" };
    } else {
      normalized = {
        status: 0,
        code: "network_error",
        message: "Cannot reach the API",
      };
    }

    return Promise.reject(normalized);
  }
);
