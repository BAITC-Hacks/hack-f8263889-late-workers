import { apiClient } from "@/core/api";

import type {
  LoginInput,
  RegisterBusinessInput,
  RegisterStudentInput,
  User,
  UserResponse,
} from "../types";

export const registerBusiness = async (
  input: RegisterBusinessInput
): Promise<User> => {
  const { data } = await apiClient.post<UserResponse>(
    "/auth/register/business",
    input
  );
  return data.user;
};

export const registerStudent = async (
  input: RegisterStudentInput
): Promise<User> => {
  const { data } = await apiClient.post<UserResponse>(
    "/auth/register/student",
    input
  );
  return data.user;
};

export const login = async (input: LoginInput): Promise<User> => {
  const { data } = await apiClient.post<UserResponse>("/auth/login", {
    ...input,
    email: input.email.trim(),
  });
  return data.user;
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

export const getMe = async (
  signal?: AbortSignal,
  bootstrap = false
): Promise<User> => {
  const { data } = await apiClient.get<UserResponse>("/auth/me", {
    signal,
    skipAuth: bootstrap,
  });
  return data.user;
};
