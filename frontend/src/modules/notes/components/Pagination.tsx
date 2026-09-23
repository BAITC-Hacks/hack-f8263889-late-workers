import { cn } from "@/common/lib/utils";
import { iconButton } from "@/common/styles";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  /** Freeze both buttons, e.g. while the next page is being fetched. */
  disabled?: boolean;
  className?: string;
};

/** Prev / next pager with an "x–y of total" readout. */
export const Pagination = ({
  total,
  limit,
  offset,
  onOffsetChange,
  disabled = false,
  className,
}: PaginationProps) => {
  const { t } = useTranslation();

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = to < total;

  return (
    <div
      className={cn(
        "flex max-w-md items-center justify-between gap-6",
        className
      )}
    >
      <p className="text-muted-foreground font-mono text-xs tabular-nums">
        {t("notes.pagination.range", { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={disabled || !hasPrev}
          className={cn(
            iconButton,
            "h-8 w-8 disabled:pointer-events-none disabled:opacity-40"
          )}
          aria-label={t("notes.pagination.prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={disabled || !hasNext}
          className={cn(
            iconButton,
            "h-8 w-8 disabled:pointer-events-none disabled:opacity-40"
          )}
          aria-label={t("notes.pagination.next")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
