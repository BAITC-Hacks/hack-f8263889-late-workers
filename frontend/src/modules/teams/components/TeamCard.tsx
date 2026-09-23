import { Card } from "@/common/components/ui";
import { Users } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { cardTags } from "../helpers";
import type { TeamSummary } from "../types";
import { RoleBadge } from "./RoleBadge";
import { TagList } from "./TagList";

/** The title link is stretched over the whole card. */
export const TeamCard = ({ team }: { team: TeamSummary }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const tags = cardTags(team.skills, team.technologies);

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      className="hover:border-primary/60 relative flex flex-col gap-4 p-5 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={team.myRole} />
      </div>
      <h2 id={titleId} className="text-base leading-snug font-semibold">
        <Link
          to={`/student/teams/${team.id}`}
          className="focus-visible:after:ring-ring after:absolute after:inset-0 after:rounded-lg focus-visible:outline-hidden focus-visible:after:ring-2"
        >
          {team.name}
        </Link>
      </h2>
      <TagList
        tags={tags.shown}
        hidden={tags.hidden}
        label={t("teams.card.tags")}
      />
      <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span
          className="inline-flex items-center gap-1.5 tabular-nums"
          aria-label={t("teams.card.membersLabel", {
            count: team.membersCount,
            limit: team.membersLimit,
          })}
        >
          <Users className="size-4" aria-hidden="true" />
          {team.membersCount} / {team.membersLimit}
        </span>
        <span>{t("teams.points", { count: team.points })}</span>
      </div>
    </Card>
  );
};
