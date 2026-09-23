import { Stack } from "@/common/components/layout";
import { field, fieldError, fieldLabel } from "@/common/styles";
import type { ComponentPropsWithRef } from "react";

type AuthFieldProps = ComponentPropsWithRef<"input"> & {
  id: string;
  label: string;
  error?: string;
};

export const AuthField = ({ id, label, error, ...input }: AuthFieldProps) => (
  <Stack gap="xs">
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    <input
      {...input}
      id={id}
      className={field}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className={fieldError} role="alert">
        {error}
      </p>
    )}
  </Stack>
);
