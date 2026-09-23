type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export const sessionEvents = {
  version: () => version,
  advance: () => ++version,
  expire(requestVersion: number) {
    if (requestVersion !== version) return;
    version += 1;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const removeLegacyToken = () => {
  try {
    localStorage.removeItem("authToken");
  } catch {
    // Cookie authentication also works when browser storage is unavailable.
  }
};
