import { cn, describedBy } from "@/common/lib/utils";
import { field, fieldError, fieldLabel } from "@/common/styles";
import type { ComponentPropsWithRef, ReactNode } from "react";

type FormFieldProps = ComponentPropsWithRef<"input"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
};

export const FormField = ({
  id,
  label,
  error,
  hint,
  className,
  ...input
}: FormFieldProps) => (
  <div className={cn("space-y-1", className)}>
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    <input
      {...input}
      id={id}
      className={field}
      aria-invalid={!!error}
      aria-describedby={describedBy(id, hint, error)}
    />
    {hint && (
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className={fieldError} role="alert">
        {error}
      </p>
    )}
  </div>
);
