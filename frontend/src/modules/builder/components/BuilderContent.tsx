import { Stack } from "@/common/components/layout";
import { Badge } from "@/common/components/ui";
import { pageTitle, prose } from "@/common/styles";
import { statusBadgeVariant } from "@/modules/catalog";
import { useTranslation } from "react-i18next";

import {
  earlierRounds,
  lastRound,
  stepForStatus,
  usedFallback,
  viewForTask,
} from "../helpers";
import { useScrollToTop } from "../hooks/useScrollToTop";
import type { BuilderTask } from "../types";
import { AssessmentPanel } from "./AssessmentPanel";
import { BuilderSteps } from "./BuilderSteps";
import { CardStep } from "./CardEditor";
import { AnalyzeDraft, DraftTextBlock } from "./DraftText";
import { FallbackNotice } from "./Feedback";
import { PastRounds, RoundForm } from "./RoundForm";

/** One screen per status; each action's response replaces `task` wholesale. */
export const BuilderContent = ({ task }: { task: BuilderTask }) => {
  const { t } = useTranslation();
  const view = viewForTask(task);
  const round = lastRound(task);
  const showDraft = view === "analyze" || !!task.draftText;
  useScrollToTop(`${view}:${task.rounds.length}`);

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <h1 className={pageTitle}>{t("builder.title")}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={statusBadgeVariant(task.status)}>
            {task.status.name}
          </Badge>
          <span>{task.industry.name}</span>
        </div>
      </Stack>
      <BuilderSteps active={stepForStatus(task.status.code)} />
      {(usedFallback(task) || showDraft) && (
        <Stack gap="md" className={prose}>
          {usedFallback(task) && <FallbackNotice />}
          {showDraft && (
            <DraftTextBlock text={task.draftText} open={view === "analyze"} />
          )}
        </Stack>
      )}
      {view === "analyze" && <AnalyzeDraft taskId={task.id} />}
      {view === "clarify" && round && (
        <Stack gap="xl" className={prose}>
          <AssessmentPanel assessment={round.assessment} />
          <PastRounds rounds={earlierRounds(task)} />
          <RoundForm key={round.number} task={task} round={round} />
        </Stack>
      )}
      {view === "card" && <CardStep task={task} />}
    </Stack>
  );
};
