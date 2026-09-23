/**
 * Single source of truth for the JWT. The axios client and the SSE helper read
 * it; the auth module writes it and subscribes to changes (e.g. a 401 clearing it).
 */

const STORAGE_KEY = "authToken";

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

// In-memory fallback so auth still works for the session when localStorage is
// unavailable (private mode, disabled site data) — it just won't survive a reload.
let memoryToken: string | null = null;

const read = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
};

const write = (token: string | null) => {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — memoryToken above keeps the session working.
  }
};

export const tokenStorage = {
  get: read,
  set(token: string | null) {
    write(token);
    listeners.forEach((listener) => listener(token));
  },
  clear() {
    tokenStorage.set(null);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
