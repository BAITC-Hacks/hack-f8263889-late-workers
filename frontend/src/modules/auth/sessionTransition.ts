import { sessionEvents } from "@/core/api";

let active: symbol | null = null;
export const sessionMutationKey = ["auth", "transition"];

export const beginSessionTransition = () => {
  if (active) throw new Error("An authentication request is already pending");
  active = Symbol();
  return { version: sessionEvents.version(), token: active };
};

export const endSessionTransition = (transition?: { token: symbol }) => {
  if (transition?.token === active) active = null;
};
