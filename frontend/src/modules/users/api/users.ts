import { API_URL, apiClient } from "@/core/api";

/**
 * The users contract is unversioned (`/api/users`), while `apiClient` is mounted
 * on `/api/v1` — axios skips `baseURL` for an absolute URL, so the interceptors
 * (auth header, error normalization) still apply. Same trick as `system/api/health.ts`.
 */
const USERS_API_URL = `${API_URL}/api/users`;

export type Gender = "male" | "female" | "unknown";
export type UserStatus = "active" | "blocked";
export type UsersSort = "lastName" | "email" | "createdAt";
export type SortOrder = "asc" | "desc";

/** Fields come in camelCase, exactly as the contract spells them. */
export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  status: UserStatus;
  /** ISO 8601 UTC. */
  createdAt: string;
};

export type UsersQuery = {
  /** 1-based, backend default 1. */
  page?: number;
  /** Page size, backend default 20. */
  limit?: number;
  /** Free-text search. */
  q?: string;
  /** Omitted means "any status". */
  status?: UserStatus;
  sort?: UsersSort;
  order?: SortOrder;
};

export type UsersPage = {
  items: User[];
  total: number;
  page: number;
  limit: number;
};

export type UserCreate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
};

export type UserUpdate = Partial<UserCreate>;

export const listUsers = async (query: UsersQuery = {}): Promise<UsersPage> => {
  const { data } = await apiClient.get<UsersPage>(USERS_API_URL, {
    params: query,
  });
  return data;
};

export const createUser = async (input: UserCreate): Promise<User> => {
  const { data } = await apiClient.post<User>(USERS_API_URL, input);
  return data;
};

export const updateUser = async (
  id: number,
  patch: UserUpdate
): Promise<User> => {
  const { data } = await apiClient.patch<User>(`${USERS_API_URL}/${id}`, patch);
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`${USERS_API_URL}/${id}`);
};

export const blockUser = async (id: number): Promise<User> => {
  const { data } = await apiClient.post<User>(`${USERS_API_URL}/${id}/block`);
  return data;
};

export const unblockUser = async (id: number): Promise<User> => {
  const { data } = await apiClient.post<User>(`${USERS_API_URL}/${id}/unblock`);
  return data;
};
