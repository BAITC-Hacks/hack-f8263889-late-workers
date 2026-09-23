import { Section, Stack } from "@/common/components/layout";
import { Card } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import {
  blockNameKey,
  ratingHints,
  ratingHintsId,
  ratingShare,
} from "../helpers";
import type { BlockCode, BuilderTask, RatingEntry } from "../types";
import { QualityBadge } from "./AssessmentPanel";
import { BuilderBadges } from "./BuilderBadges";
import { RatingHintList } from "./RatingHintList";
import { ReadinessProgress } from "./ReadinessProgress";

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
  taskId: number;
  entries: RatingEntry[];
  onHint: (block: BlockCode) => void;
};

const RatingHints = ({ taskId, entries, onHint }: RatingHintsProps) => {
  const { t } = useTranslation();
  const hints = ratingHints(entries);

  return (
    <Stack gap="sm" className="border-t pt-4">
      <h3
        id={ratingHintsId(taskId)}
        tabIndex={-1}
        className="focus-visible:ring-ring scroll-mt-6 rounded-xs text-sm font-semibold outline-hidden focus-visible:ring-1"
      >
        {t("builder.rating.hintsTitle")}
      </h3>
      {hints.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("builder.rating.complete")}
        </p>
      ) : (
        <RatingHintList hints={hints} onHint={onHint} />
      )}
    </Stack>
  );
};

type RatingPanelProps = {
  task: BuilderTask;
  /** The form holds edits the rating does not reflect yet. */
  stale: boolean;
  onHint: (block: BlockCode) => void;
  onAllHints: () => void;
};

export const RatingPanel = ({
  task,
  stale,
  onHint,
  onAllHints,
}: RatingPanelProps) => {
  const { t } = useTranslation();

  return (
    <Card className="space-y-8 p-5">
      <ReadinessProgress task={task} onHint={onHint} onAllHints={onAllHints} />
      <BuilderBadges task={task} />
      <Section title={t("builder.rating.title")} divider={false}>
        <Stack gap="lg">
          {task.rating === null && (
            <p className="text-muted-foreground text-sm">
              {t("builder.rating.pending")}
            </p>
          )}
          {task.ratingBreakdown && (
            <>
              {stale && (
                <p className="text-warning text-sm">
                  {t("builder.rating.stale")}
                </p>
              )}
              <RatingBreakdown entries={task.ratingBreakdown} />
              <RatingHints
                taskId={task.id}
                entries={task.ratingBreakdown}
                onHint={onHint}
              />
            </>
          )}
        </Stack>
      </Section>
    </Card>
  );
};
