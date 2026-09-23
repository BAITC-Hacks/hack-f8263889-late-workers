import { create } from "zustand";

type AppState = {
  count: number;
  increase: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
}));
