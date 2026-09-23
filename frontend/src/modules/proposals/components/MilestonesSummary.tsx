import { Badge } from "@/common/components/ui";
import { metaLabel } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { earnedPoints } from "../helpers";
import type { Milestone } from "../types";

/** The team's read-only view of a selected proposal's milestones. */
export const MilestonesSummary = ({
  milestones,
}: {
  milestones: Milestone[];
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className={metaLabel}>{t("proposals.milestones.title")}</h3>
      {milestones.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("proposals.milestones.empty")}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              >
                <span className="break-words">{milestone.title}</span>
                {milestone.confirmed ? (
                  <Badge variant="success">
                    {t("proposals.milestones.confirmed", {
                      points: milestone.points,
                    })}
                  </Badge>
                ) : (
                  <Badge variant="muted">
                    {t("proposals.milestones.inProgress")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">
            {t("proposals.milestones.earned", {
              points: earnedPoints(milestones),
            })}
          </p>
        </>
      )}
    </section>
  );
};
