import { cn } from "@/common/lib/utils";
import { type ReactNode, useId } from "react";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Shown on hover and on keyboard focus. The wrapper takes focus itself, so the
 * trigger can be plain text; keep interactive elements out of `children`.
 */
export const Tooltip = ({ content, children, className }: TooltipProps) => {
  const id = useId();
  return (
    <span
      tabIndex={0}
      aria-describedby={id}
      className={cn(
        "group/tooltip focus-visible:ring-ring relative inline-flex rounded-md outline-hidden focus-visible:ring-1",
        className
      )}
    >
      {children}
      <span
        role="tooltip"
        id={id}
        className="bg-popover text-popover-foreground pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-max max-w-72 rounded-md border px-3 py-2 text-left text-xs font-normal opacity-0 transition-opacity group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-visible/tooltip:visible group-focus-visible/tooltip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
};
