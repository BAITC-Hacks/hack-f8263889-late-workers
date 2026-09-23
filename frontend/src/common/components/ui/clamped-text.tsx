import { useIsClamped } from "@/common/lib/useIsClamped";
import { cn } from "@/common/lib/utils";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ClampedTextProps = { text: string; className?: string };

/** Two lines with a "show more" toggle that appears only when text is cut. */
export const ClampedText = ({ text, className }: ClampedTextProps) => {
  const { t } = useTranslation();
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const clamped = useIsClamped(ref);

  return (
    <div className={cn("space-y-1", className)}>
      <p
        id={id}
        ref={ref}
        className={cn(
          "text-sm whitespace-pre-line",
          !expanded && "line-clamp-2"
        )}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t(expanded ? "common.showLess" : "common.showMore")}
        </button>
      )}
    </div>
  );
};
