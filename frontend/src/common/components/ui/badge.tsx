import { cn } from "@/common/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-success/10 text-success",
        destructive: "bg-destructive/10 text-destructive",
        warning: "bg-warning/10 text-warning",
        primary: "bg-primary/10 text-primary",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
