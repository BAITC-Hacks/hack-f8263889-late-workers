import { cn } from "@/common/lib/utils";
import { useTranslation } from "react-i18next";

import { pageNumbers } from "../helpers";

type UsersPaginationProps = {
  total: number;
  limit: number;
  page: number;
  onPageChange: (page: number) => void;
  /** Freeze the pager, e.g. while the next page is being fetched. */
  disabled?: boolean;
  className?: string;
};

export const UsersPagination = ({
  total,
  limit,
  page,
  onPageChange,
  disabled = false,
  className,
}: UsersPaginationProps) => {
  const { t } = useTranslation();
  const pages = pageNumbers(total, limit);

  return (
    <div
      className={cn(
        "flex max-w-2xl flex-wrap items-center justify-between gap-4",
        className
      )}
    >
      <p className="text-muted-foreground font-mono text-xs tabular-nums">
        {t("users.pagination.total", { total })}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            disabled={disabled}
            aria-current={number === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-md border px-2 text-sm tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40",
              number === page
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-primary hover:text-primary"
            )}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
};
