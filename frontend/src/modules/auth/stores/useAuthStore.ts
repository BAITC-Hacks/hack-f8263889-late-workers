import { tokenStorage } from "@/core/api";
import { create } from "zustand";

type AuthState = {
  token: string | null;
  /** Derived from `token` — kept in sync by the tokenStorage subscription below. */
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const initialToken = tokenStorage.get();

export const useAuthStore = create<AuthState>(() => ({
  token: initialToken,
  isAuthenticated: initialToken !== null,
  // Both actions write tokenStorage; the subscription routes the change back
  // into the store, so there is a single code path for every token update.
  setToken: (token) => tokenStorage.set(token),
  logout: () => tokenStorage.clear(),
}));

// tokenStorage is the source of truth for the JWT. Any change — login, logout,
// or the axios interceptor clearing a rejected token on 401 — lands here, so
// the UI reacts (e.g. RequireAuth redirects) no matter who cleared it.
tokenStorage.subscribe((token) => {
  useAuthStore.setState({ token, isAuthenticated: token !== null });
});
