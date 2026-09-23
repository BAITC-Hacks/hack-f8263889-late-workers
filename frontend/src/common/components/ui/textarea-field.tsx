import { cn, describedBy } from "@/common/lib/utils";
import { field, fieldError, fieldLabel } from "@/common/styles";
import type { ComponentPropsWithRef } from "react";

type TextareaFieldProps = ComponentPropsWithRef<"textarea"> & {
  id: string;
  label: string;
  /** Current length, shown as `N / limit`. */
  length: number;
  limit: number;
  error?: string;
};

export const TextareaField = ({
  id,
  label,
  length,
  limit,
  error,
  className,
  ...textarea
}: TextareaFieldProps) => (
  <div className={cn("space-y-1", className)}>
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    <textarea
      rows={5}
      {...textarea}
      id={id}
      className={cn(field, "min-h-28 resize-y")}
      aria-invalid={!!error}
      aria-describedby={describedBy(id, true, error)}
    />
    <p
      id={`${id}-hint`}
      className={cn(
        "text-xs tabular-nums",
        length > limit ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {length} / {limit}
    </p>
    {error && (
      <p id={`${id}-error`} className={fieldError} role="alert">
        {error}
      </p>
    )}
  </div>
);
