import { create } from "zustand";

export type Toast = { id: number; message: string };

type ToastState = {
  toasts: Toast[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
};

const TOAST_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message }] });
    setTimeout(() => get().dismiss(id), TOAST_MS);
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const showToast = (message: string) =>
  useToastStore.getState().show(message);
