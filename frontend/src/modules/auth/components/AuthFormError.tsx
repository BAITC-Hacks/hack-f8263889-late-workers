import { fieldError } from "@/common/styles";

export const AuthFormError = ({ message }: { message?: string }) =>
  message ? (
    <p className={fieldError} role="alert">
      {message}
    </p>
  ) : null;
