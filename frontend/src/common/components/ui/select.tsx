import { cn } from "@/common/lib/utils";
import { field } from "@/common/styles";
import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Native `<select>` styled like the rest of the fields — invalid state via `aria-invalid`. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(field, className)} {...props} />
  )
);
Select.displayName = "Select";

export { Select };
