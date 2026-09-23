import { useAuthStore } from "../stores/useAuthStore";

export const useMe = () => ({ data: useAuthStore((state) => state.user) });
