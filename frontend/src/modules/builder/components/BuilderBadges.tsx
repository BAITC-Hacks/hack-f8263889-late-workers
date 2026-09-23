import { Section } from "@/common/components/layout";
import { Badge, Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import {
  badgeConditionKey,
  badgeNameKey,
  useBadges,
} from "@/modules/gamification";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { builderBadgeStates } from "../helpers";
import type { BuilderTask } from "../types";

const ConfirmedBadges = ({ task }: { task: BuilderTask }) => {
  const { t } = useTranslation();
  const badges = useBadges();

  if (badges.isPending) {
    return (
      <div
        aria-busy="true"
        aria-label={t("common.loading")}
        className="space-y-3"
      >
        <div className={cn(skeleton, "h-6 w-32 motion-reduce:animate-none")} />
        <div className={cn(skeleton, "h-6 w-40 motion-reduce:animate-none")} />
        <div className={cn(skeleton, "h-6 w-36 motion-reduce:animate-none")} />
      </div>
    );
  }

  if (badges.isError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-destructive text-sm">
          {t("gamification.builderBadges.error")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={badges.isFetching}
          onClick={() => void badges.refetch()}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {builderBadgeStates(badges.data, task.badges).map((badge) => (
        <li key={badge.code} className="space-y-1.5">
          <Badge
            variant={badge.earned ? "success" : "muted"}
            className="max-w-full gap-1 whitespace-normal"
          >
            {badge.earned && (
              <Check className="size-3 shrink-0" aria-hidden="true" />
            )}
            {t(badgeNameKey(badge.code), { defaultValue: badge.name })}
            {badge.earned && (
              <span className="sr-only">
                {" "}
                — {t("gamification.builderBadges.earned")}
              </span>
            )}
          </Badge>
          {!badge.earned && (
            <p className="text-muted-foreground text-xs">
              {t("gamification.builderBadges.how", {
                condition: t(badgeConditionKey(badge.code), {
                  defaultValue: badge.condition,
                }),
              })}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
};

export const BuilderBadges = ({ task }: { task: BuilderTask }) => {
  const { t } = useTranslation();
  return (
    <Section title={t("gamification.builderBadges.title")} divider={false}>
      {task.confirmedAt === null ? (
        <p className="text-muted-foreground text-sm">
          {t("gamification.builderBadges.pending")}
        </p>
      ) : (
        <ConfirmedBadges task={task} />
      )}
    </Section>
  );
};
