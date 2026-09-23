import { Card } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { CatalogLinkState } from "../helpers";
import type { TaskListItem } from "../types";
import { TaskBadges } from "./TaskBadges";

type TaskCardProps = {
  task: TaskListItem;
  /** Catalog address to return to from the task page. */
  catalogSearch?: string;
  action?: ReactNode;
};

/**
 * The title link is stretched over the whole card; `action` sits above it,
 * so pressing the action never opens the task.
 */
export const TaskCard = ({ task, catalogSearch, action }: TaskCardProps) => {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      className={cn(
        "hover:border-primary/60 relative flex flex-col gap-4 p-5 transition-colors",
        task.level.code === "priority" && "border-primary"
      )}
    >
      <TaskBadges level={task.level.code} status={task.status} />
      <div className="space-y-1">
        <h2 id={titleId} className="text-base leading-snug font-semibold">
          <Link
            to={`/catalog/${task.id}`}
            state={
              catalogSearch === undefined
                ? undefined
                : ({ catalogSearch } satisfies CatalogLinkState)
            }
            className="focus-visible:after:ring-ring after:absolute after:inset-0 after:rounded-lg focus-visible:outline-hidden focus-visible:after:ring-2"
          >
            {task.title}
          </Link>
        </h2>
        <p className="text-muted-foreground text-sm">
          {task.companyName} · {task.industry.name}
        </p>
      </div>
      <p className="line-clamp-4 text-sm">{task.needExcerpt}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
        <span>
          <span className="text-muted-foreground">
            {t("catalog.card.rating")}{" "}
          </span>
          <span className="font-medium tabular-nums">
            {t("catalog.card.ratingValue", { rating: task.rating })}
          </span>
        </span>
        <span className="text-muted-foreground">
          {t("catalog.card.responses", { count: task.responsesCount })}
        </span>
        {action && <div className="relative z-10 ml-auto">{action}</div>}
      </div>
    </Card>
  );
};
