import type { FormEventHandler, ReactNode } from "react";

import { AuthFormError } from "./AuthFormError";
import { AuthSubmit } from "./AuthSubmit";

type AuthFormProps = {
  pending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  error?: string;
  action: "login" | "register";
  children: ReactNode;
};

export const AuthForm = ({
  pending,
  onSubmit,
  error,
  action,
  children,
}: AuthFormProps) => (
  <form
    noValidate
    onSubmit={onSubmit}
    className="space-y-5"
    aria-busy={pending}
  >
    <AuthFormError message={error} />
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      {children}
      <AuthSubmit pending={pending} action={action} />
    </fieldset>
  </form>
);
