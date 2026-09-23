import { Section, Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import {
  LevelBadge,
  levelLabelKey,
  levelProgressClass,
} from "@/modules/catalog";
import { useTranslation } from "react-i18next";

import {
  RATING_THRESHOLDS,
  nextRatingLevel,
  ratingHints,
  ratingProgress,
} from "../helpers";
import type { BlockCode, BuilderTask } from "../types";
import { RatingHintList } from "./RatingHintList";

type ReadinessProgressProps = {
  task: BuilderTask;
  onHint: (block: BlockCode) => void;
  onAllHints: () => void;
};

export const ReadinessProgress = ({
  task,
  onHint,
  onAllHints,
}: ReadinessProgressProps) => {
  const { t } = useTranslation();
  if (task.rating === null) return null;

  const next = nextRatingLevel(task.rating);
  const hints = ratingHints(task.ratingBreakdown ?? []).slice(0, 3);
  const description = next
    ? t("gamification.progress.remaining", {
        count: next.remaining,
        level: t(levelLabelKey(next.level)),
      })
    : t("gamification.progress.ready");

  return (
    <Section title={t("gamification.progress.title")} divider={false}>
      <Stack gap="md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {t("catalog.card.ratingValue", { rating: task.rating })}
          </span>
          {task.level && <LevelBadge level={task.level.code} />}
        </div>
        <div>
          <div
            className="text-muted-foreground mb-1 flex justify-between text-xs tabular-nums"
            aria-hidden="true"
          >
            <span>0</span>
            <span>100</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("gamification.progress.title")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ratingProgress(task.rating)}
            aria-valuetext={`${task.rating}/100. ${description}`}
            className="bg-muted relative h-3 rounded-full"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-400 ease-out motion-reduce:transition-none",
                task.level
                  ? levelProgressClass(task.level.code)
                  : "bg-muted-foreground"
              )}
              style={{ width: `${ratingProgress(task.rating)}%` }}
            />
            {RATING_THRESHOLDS.map((threshold) => (
              <span
                key={threshold.points}
                className="bg-foreground absolute inset-y-0 w-px"
                style={{ left: `${threshold.points}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <div
            className="text-muted-foreground relative h-20 text-xs"
            aria-hidden="true"
          >
            {RATING_THRESHOLDS.map((threshold) => (
              <div
                key={threshold.points}
                className="absolute top-1 -translate-x-1/2 text-center"
                style={{ left: `${threshold.points}%` }}
              >
                <span className="tabular-nums">{threshold.points}</span>
                <span
                  className={cn(
                    "absolute top-5 whitespace-nowrap",
                    threshold.level === "priority"
                      ? "top-10 right-0"
                      : "left-1/2 -translate-x-1/2"
                  )}
                >
                  {t(levelLabelKey(threshold.level))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm" aria-live="polite">
          {description}
        </p>
        {hints.length > 0 && (
          <Stack gap="sm">
            <RatingHintList hints={hints} onHint={onHint} />
            <Button
              type="button"
              variant="ghost"
              onClick={onAllHints}
              className="self-start"
            >
              {t("gamification.progress.allHints")}
            </Button>
          </Stack>
        )}
      </Stack>
    </Section>
  );
};
