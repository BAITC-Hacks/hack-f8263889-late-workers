import { fieldError } from "@/common/styles";
import type { ReactNode } from "react";

export const FormError = ({
  message,
  children,
}: {
  message?: string;
  children?: ReactNode;
}) =>
  message ? (
    <p className={fieldError} role="alert">
      {message} {children}
    </p>
  ) : null;
