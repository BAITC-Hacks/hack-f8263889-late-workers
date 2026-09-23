import { Badge } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { isInProgress, levelBadgeVariant, levelLabelKey } from "../helpers";
import type { TaskLevelCode } from "../types";

export const LevelBadge = ({ level }: { level: TaskLevelCode }) => {
  const { t } = useTranslation();
  return (
    <Badge variant={levelBadgeVariant(level)}>{t(levelLabelKey(level))}</Badge>
  );
};

type TaskBadgesProps = {
  level: TaskLevelCode;
  status: { code: string };
};

export const TaskBadges = ({ level, status }: TaskBadgesProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      <LevelBadge level={level} />
      {isInProgress(status) && (
        <Badge variant="warning">{t("catalog.status.inProgress")}</Badge>
      )}
    </div>
  );
};
