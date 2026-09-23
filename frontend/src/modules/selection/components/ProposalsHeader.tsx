import { Badge } from "@/common/components/ui";
import { inlineLink, pageDescription, pageTitle } from "@/common/styles";
import { LevelBadge, statusBadgeVariant } from "@/modules/catalog";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { ProposalsTask } from "../types";

export const PAGE_TITLE_ID = "task-proposals-title";

export const BackToTasks = () => {
  const { t } = useTranslation();
  return (
    <Link to="/business" className={inlineLink}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t("myTasks.title")}
    </Link>
  );
};

export const ProposalsHeader = ({ task }: { task: ProposalsTask }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h1
        id={PAGE_TITLE_ID}
        tabIndex={-1}
        className={`${pageTitle} outline-hidden`}
      >
        {task.title}
      </h1>
      <p className={pageDescription}>{t("selection.subtitle")}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Badge variant={statusBadgeVariant(task.status)}>
          {task.status.name}
        </Badge>
        <LevelBadge level={task.level.code} />
        <span>
          <span className="text-muted-foreground">
            {t("catalog.card.rating")}{" "}
          </span>
          <span className="font-medium tabular-nums">
            {t("catalog.card.ratingValue", { rating: task.rating })}
          </span>
        </span>
      </div>
    </div>
  );
};
