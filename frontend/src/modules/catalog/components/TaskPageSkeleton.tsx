import { cn } from "@/common/lib/utils";
import { definitionRow, skeleton } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { TASK_FIELDS } from "../types";

export const TaskPageSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      data-testid="task-skeleton"
      className="space-y-8"
    >
      <div className="space-y-3">
        <div className={cn(skeleton, "h-5 w-28")} />
        <div className={cn(skeleton, "h-9 w-3/4")} />
        <div className={cn(skeleton, "h-4 w-1/3")} />
        <div className={cn(skeleton, "h-4 w-1/2")} />
      </div>
      <div className="divide-y border-t">
        {TASK_FIELDS.map((key) => (
          <div key={key} className={definitionRow}>
            <div className={cn(skeleton, "h-4 w-28")} />
            <div className={cn(skeleton, "h-4 w-full")} />
          </div>
        ))}
      </div>
    </div>
  );
};
