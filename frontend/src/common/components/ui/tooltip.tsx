import { useTooltip } from "@/common/hooks/useTooltip";
import { cn } from "@/common/lib/utils";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const tooltip = useTooltip();
  return (
    <>
      <span
        ref={tooltip.triggerRef}
        tabIndex={0}
        aria-describedby={tooltip.id}
        onMouseEnter={tooltip.onMouseEnter}
        onMouseLeave={tooltip.onMouseLeave}
        onFocus={tooltip.onFocus}
        onBlur={tooltip.onBlur}
        className={cn(
          "focus-visible:ring-ring inline-flex min-w-0 rounded-md outline-hidden focus-visible:ring-1",
          className
        )}
      >
        {children}
      </span>
      {createPortal(
        <span
          ref={tooltip.tooltipRef}
          role="tooltip"
          id={tooltip.id}
          hidden={!tooltip.open}
          onMouseEnter={tooltip.onMouseEnter}
          onMouseLeave={tooltip.onMouseLeave}
          className="bg-popover text-popover-foreground invisible fixed top-0 left-0 z-50 w-max max-w-72 overflow-auto rounded-md border px-3 py-2 text-left text-xs font-normal break-words whitespace-normal"
        >
          {content}
        </span>,
        document.body
      )}
    </>
  );
};
