import { env } from "@/core/env";
import axios, { type AxiosError, type AxiosInstance } from "axios";

import { toApiError } from "./errors";
import { sessionEvents } from "./session";
import type { ApiError } from "./types";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Handle session expiry locally, e.g. the initial session lookup. */
    skipAuth?: boolean;
    sessionVersion?: number;
  }
}

/** Backend origin, e.g. `http://localhost:8000`. */
export const API_URL = env.VITE_API_URL.replace(/\/+$/, "");
/** Retained for the inactive starter SSE client. */
export const API_V1_URL = "/api/v1";

export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  // The XHR adapter drops Content-Type on the bodyless me/logout requests.
  adapter: "fetch",
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.sessionVersion = sessionEvents.version();
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
      if (
        normalized.status === 401 &&
        normalized.code === "UNAUTHORIZED" &&
        !error.config?.skipAuth
      ) {
        sessionEvents.expire(
          error.config?.sessionVersion ?? sessionEvents.version()
        );
      }
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
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
