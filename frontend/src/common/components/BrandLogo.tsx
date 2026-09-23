import { cn } from "@/common/lib/utils";
import { useId } from "react";

export const BrandLogo = ({ className }: { className?: string }) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 640 134"
      role="img"
      aria-label="TaskBridge"
      focusable="false"
      className={cn("block h-auto shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId}>
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.3" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <g
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="124"
        fontWeight="700"
      >
        <text
          x="0"
          y="102"
          textLength="260"
          lengthAdjust="spacingAndGlyphs"
          className="fill-brand-task"
        >
          Task
        </text>
        <text
          x="260"
          y="102"
          textLength="380"
          lengthAdjust="spacingAndGlyphs"
          className="fill-brand-bridge"
        >
          Bridge
        </text>
      </g>
      <path
        d="M24 122 L490 117 L490 123 Z"
        fill={`url(#${gradientId})`}
        className="text-brand-bridge"
      />
    </svg>
  );
};
