import { LoaderCircle } from "lucide-react";
import { forwardRef } from "react";

import { Button, type ButtonProps } from "./button";

type PendingButtonProps = ButtonProps & { pending: boolean };

/** Disabled with a spinner while its request is in flight. */
export const PendingButton = forwardRef<HTMLButtonElement, PendingButtonProps>(
  ({ pending, disabled, children, ...props }, ref) => (
    <Button
      ref={ref}
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    >
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
);
PendingButton.displayName = "PendingButton";
