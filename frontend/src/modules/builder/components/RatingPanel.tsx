import { Section, Stack } from "@/common/components/layout";
import { Card } from "@/common/components/ui";
import { LevelBadge } from "@/modules/catalog";
import { useTranslation } from "react-i18next";

import { blockNameKey, formatGain, ratingHints, ratingShare } from "../helpers";
import type { BlockCode, BuilderTask, RatingEntry } from "../types";
import { QualityBadge } from "./AssessmentPanel";

const RatingBreakdown = ({ entries }: { entries: RatingEntry[] }) => {
  const { t } = useTranslation();
  return (
    <ul className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.block} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">
              {t(blockNameKey(entry.block), { defaultValue: entry.name })}
            </span>
            <span className="tabular-nums">
              {entry.points} / {entry.maxPoints}
            </span>
          </div>
          <div
            className="bg-muted h-1.5 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${ratingShare(entry)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QualityBadge quality={entry.quality} />
            {entry.mode === "fallback" && (
              <span className="text-muted-foreground text-xs">
                {t("builder.rating.heuristic")}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{entry.reason}</p>
        </li>
      ))}
    </ul>
  );
};

type RatingHintsProps = {
  entries: RatingEntry[];
  onHint: (block: BlockCode) => void;
};

const RatingHints = ({ entries, onHint }: RatingHintsProps) => {
  const { t, i18n } = useTranslation();
  const hints = ratingHints(entries);

  return (
    <Stack gap="sm" className="border-t pt-4">
      <h3 className="text-sm font-semibold">
        {t("builder.rating.hintsTitle")}
      </h3>
      {hints.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("builder.rating.complete")}
        </p>
      ) : (
        <ul className="space-y-2">
          {hints.map((hint) => (
            <li key={hint.block}>
              <button
                type="button"
                onClick={() => onHint(hint.block)}
                className="text-primary focus-visible:ring-ring rounded-xs text-left text-sm outline-hidden hover:underline focus-visible:ring-1"
              >
                {t("builder.rating.hint", {
                  hint: t(hint.textKey),
                  gain: formatGain(hint.gain, i18n.language),
                })}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
};

type RatingPanelProps = {
  task: BuilderTask;
  /** The form holds edits the rating does not reflect yet. */
  stale: boolean;
  onHint: (block: BlockCode) => void;
};

export const RatingPanel = ({ task, stale, onHint }: RatingPanelProps) => {
  const { t } = useTranslation();

  return (
    <Card className="p-5">
      <Section title={t("builder.rating.title")} divider={false}>
        <Stack gap="lg">
          {task.rating === null || task.level === null ? (
            <p className="text-muted-foreground text-sm">
              {t("builder.rating.pending")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-semibold tabular-nums">
                {t("catalog.card.ratingValue", { rating: task.rating })}
              </span>
              <LevelBadge level={task.level.code} />
            </div>
          )}
          {task.ratingBreakdown && (
            <>
              {stale && (
                <p className="text-warning text-sm">
                  {t("builder.rating.stale")}
                </p>
              )}
              <RatingBreakdown entries={task.ratingBreakdown} />
              <RatingHints entries={task.ratingBreakdown} onHint={onHint} />
            </>
          )}
        </Stack>
      </Section>
    </Card>
  );
};
