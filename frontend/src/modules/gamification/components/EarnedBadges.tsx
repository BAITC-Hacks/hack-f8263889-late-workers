import { Badge, Tooltip } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import {
  badgeConditionKey,
  badgeDefinition,
  badgeNameKey,
  displayedBadges,
} from "../helpers";
import { useBadges } from "../hooks/useBadges";
import type { EarnedBadge } from "../types";

type EarnedBadgesProps = {
  badges: EarnedBadge[];
  limit?: number;
  withTooltips?: boolean;
};

export const EarnedBadges = ({
  badges,
  limit,
  withTooltips = false,
}: EarnedBadgesProps) => {
  const { t } = useTranslation();
  const definitions = useBadges(withTooltips && badges.length > 0);
  const { visible, remaining } = displayedBadges(badges, limit);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((badge) => {
        const definition = badgeDefinition(definitions.data, badge.code);
        const label = (
          <Badge variant="success" className="min-w-0 whitespace-normal">
            {t(badgeNameKey(badge.code), { defaultValue: badge.name })}
          </Badge>
        );
        return withTooltips && definition ? (
          <Tooltip
            key={badge.code}
            content={t(badgeConditionKey(badge.code), {
              defaultValue: definition.condition,
            })}
          >
            {label}
          </Tooltip>
        ) : (
          <span key={badge.code}>{label}</span>
        );
      })}
      {remaining > 0 && (
        <Badge
          aria-label={t("gamification.badgeMoreLabel", { count: remaining })}
        >
          {t("gamification.badgeMore", { count: remaining })}
        </Badge>
      )}
    </div>
  );
};
