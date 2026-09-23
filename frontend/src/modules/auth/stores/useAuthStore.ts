import { create } from "zustand";

import type { User } from "../types";

type AuthState = {
  user: User | null;
  status: "loading" | "ready" | "error";
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: () => void;
  setError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: "ready" }),
  clearUser: () => set({ user: null, status: "ready" }),
  setLoading: () => set({ status: "loading" }),
  setError: () => set({ user: null, status: "error" }),
}));
