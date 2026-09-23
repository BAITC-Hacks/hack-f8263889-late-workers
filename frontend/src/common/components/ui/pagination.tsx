import { cn, pageNumbers } from "@/common/lib/utils";

type PaginationProps = {
  total: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  label: string;
  /** Freeze the pager, e.g. while the next page is being fetched. */
  disabled?: boolean;
  className?: string;
};

/** Numbered pager; renders nothing when everything fits on one page. */
export const Pagination = ({
  total,
  pageSize,
  page,
  onPageChange,
  label,
  disabled = false,
  className,
}: PaginationProps) => {
  if (total <= pageSize) return null;

  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1", className)}>
      {pageNumbers(total, pageSize).map((number) => (
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
    </nav>
  );
};
