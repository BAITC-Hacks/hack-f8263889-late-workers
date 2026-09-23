import { registerBusiness, registerStudent } from "../api/auth";
import { useSessionMutation } from "./useSessionMutation";

export const useRegisterBusiness = () => useSessionMutation(registerBusiness);
export const useRegisterStudent = () => useSessionMutation(registerStudent);
