import type { User } from "./types";

export const homeForUser = (user: User | null) =>
  user ? `/${user.role}` : "/login";
