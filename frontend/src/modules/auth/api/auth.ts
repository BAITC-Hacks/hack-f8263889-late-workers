import { apiClient } from "@/core/api";

/** Mirrors backend/app/schemas/user.py::UserRead. */
export type User = {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

/** Mirrors backend/app/schemas/auth.py::Token. */
export type Token = {
  access_token: string;
  token_type: "bearer";
};

export type RegisterInput = {
  email: string;
  password: string;
  full_name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

/** `POST /auth/register` — 201 with the new user, 409 `conflict` if the email is taken. */
export const register = async (input: RegisterInput): Promise<User> => {
  const { data } = await apiClient.post<User>("/auth/register", input, {
    skipAuth: true,
  });
  return data;
};

/**
 * `POST /auth/login/json` — 401 on bad credentials. `skipAuth` keeps a stale
 * token out of the request and stops that 401 from logging the user out.
 */
export const login = async (input: LoginInput): Promise<Token> => {
  const { data } = await apiClient.post<Token>("/auth/login/json", input, {
    skipAuth: true,
  });
  return data;
};

/** `GET /users/me` — the signed-in user; a 401 here clears the token (interceptor). */
export const fetchMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
};
