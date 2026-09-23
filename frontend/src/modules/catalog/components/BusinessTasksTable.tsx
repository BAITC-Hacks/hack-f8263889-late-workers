import { Badge } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { skeleton, tableCell, tableHeadCell } from "@/common/styles";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { formatUpdatedDate, statusBadgeVariant } from "../helpers";
import type { BusinessTask } from "../types";
import { LevelBadge } from "./TaskBadges";

const COLUMNS = [
  "title",
  "status",
  "rating",
  "level",
  "responses",
  "updatedAt",
] as const;
const SKELETON_WIDTHS = ["w-56", "w-24", "w-16", "w-28", "w-8", "w-24"];

const TableFrame = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className={tableHeadCell}>
                {t(`myTasks.columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
};

/** The whole row opens the task; the title link keeps it reachable by keyboard. */
export const BusinessTasksTable = ({ tasks }: { tasks: BusinessTask[] }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <TableFrame>
      {tasks.map((task) => (
        <tr
          key={task.id}
          onClick={() => navigate(`/catalog/${task.id}`)}
          className="hover:bg-muted/50 cursor-pointer transition-colors"
        >
          <td className={cn(tableCell, "min-w-48 font-medium")}>
            <Link
              to={`/catalog/${task.id}`}
              onClick={(event) => event.stopPropagation()}
              className="hover:text-primary"
            >
              {task.title}
            </Link>
          </td>
          <td className={tableCell}>
            <Badge variant={statusBadgeVariant(task.status)}>
              {task.status.name}
            </Badge>
          </td>
          <td className={cn(tableCell, "whitespace-nowrap tabular-nums")}>
            {t("catalog.card.ratingValue", { rating: task.rating })}
          </td>
          <td className={tableCell}>
            <LevelBadge level={task.level.code} />
          </td>
          <td className={cn(tableCell, "tabular-nums")}>
            {task.responsesCount}
          </td>
          <td className={cn(tableCell, "whitespace-nowrap tabular-nums")}>
            {formatUpdatedDate(task.updatedAt, i18n.language)}
          </td>
        </tr>
      ))}
    </TableFrame>
  );
};

export const BusinessTasksTableSkeleton = ({ rows }: { rows: number }) => (
  <TableFrame>
    {Array.from({ length: rows }, (_, row) => (
      <tr key={row} data-testid="business-task-skeleton">
        {SKELETON_WIDTHS.map((width, column) => (
          <td key={column} className={tableCell}>
            <div className={cn(skeleton, "h-4", width)} />
          </td>
        ))}
      </tr>
    ))}
  </TableFrame>
);
