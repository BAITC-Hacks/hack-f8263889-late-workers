import { login } from "../api/auth";
import { useSessionMutation } from "./useSessionMutation";

export const useLogin = () => useSessionMutation(login);
