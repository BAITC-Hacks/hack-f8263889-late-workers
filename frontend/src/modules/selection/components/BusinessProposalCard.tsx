import { Button, Card, ClampedText } from "@/common/components/ui";
import { fieldLabel } from "@/common/styles";
import { formatDateTime } from "@/core/api";
import { StatusBadge } from "@/modules/proposals";
import { TagList, cardTags } from "@/modules/teams";
import { ExternalLink, Users } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CARD_TAGS,
  TEAM_MEMBERS_LIMIT,
  canDecide,
  proposalHeadingId,
} from "../helpers";
import type { BusinessProposal, Verdict } from "../types";
import { MilestonesBlock } from "./MilestonesBlock";
import { TeamRoster } from "./TeamRoster";

type BusinessProposalCardProps = {
  taskId: number;
  proposal: BusinessProposal;
  compared: boolean;
  /** Three proposals are already marked and this one is not. */
  compareFull: boolean;
  onToggleCompare: () => void;
  onDecide: (verdict: Verdict) => void;
};

export const BusinessProposalCard = ({
  taskId,
  proposal,
  compared,
  compareFull,
  onToggleCompare,
  onDecide,
}: BusinessProposalCardProps) => {
  const { t, i18n } = useTranslation();
  const [rosterOpen, setRosterOpen] = useState(false);
  const rosterId = useId();
  const compareId = useId();
  const { team } = proposal;
  const tags = cardTags(team.skills, team.technologies, CARD_TAGS);
  const headingId = proposalHeadingId(proposal.id);

  return (
    <Card
      role="article"
      aria-labelledby={headingId}
      className="flex flex-col gap-4 p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge status={proposal.status} />
        <span className="text-muted-foreground text-sm">
          {t("proposals.card.sentAt", {
            date: formatDateTime(proposal.createdAt, i18n.language, {
              dateStyle: "medium",
            }),
          })}
        </span>
      </div>
      <div className="space-y-2">
        <h2
          id={headingId}
          tabIndex={-1}
          className="text-lg leading-snug font-semibold outline-hidden"
        >
          {team.name}
        </h2>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span
            className="inline-flex items-center gap-1.5 tabular-nums"
            aria-label={t("teams.card.membersLabel", {
              count: team.membersCount,
              limit: TEAM_MEMBERS_LIMIT,
            })}
          >
            <Users className="size-4" aria-hidden="true" />
            {team.membersCount} / {TEAM_MEMBERS_LIMIT}
          </span>
          <span>{t("teams.points", { count: team.points })}</span>
          <span>
            {t("proposals.card.weeks", { count: proposal.durationWeeks })}
          </span>
        </p>
        <TagList
          tags={tags.shown}
          hidden={tags.hidden}
          label={t("teams.card.tags")}
        />
      </div>
      <div className="space-y-1">
        <p className={fieldLabel}>{t("selection.card.idea")}</p>
        <ClampedText text={proposal.idea} />
      </div>
      <div className="space-y-1">
        <p className={fieldLabel}>{t("selection.card.plan")}</p>
        <ClampedText text={proposal.plan} />
      </div>
      {proposal.prototypeUrl && (
        <a
          href={proposal.prototypeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-medium break-all hover:underline"
        >
          {t("selection.card.prototype")}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      )}
      {proposal.businessComment && (
        <p className="text-sm">
          <span className="font-medium">{t("selection.card.comment")}</span>{" "}
          {proposal.businessComment}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label
          htmlFor={compareId}
          className="inline-flex items-center gap-2 text-sm"
        >
          <input
            id={compareId}
            type="checkbox"
            checked={compared}
            disabled={!compared && compareFull}
            onChange={onToggleCompare}
            className="accent-primary size-4"
          />
          {t("selection.card.compare")}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={rosterOpen}
          aria-controls={rosterId}
          onClick={() => setRosterOpen(!rosterOpen)}
        >
          {t(
            rosterOpen ? "selection.card.hideRoster" : "selection.card.roster"
          )}
        </Button>
        {canDecide(proposal) && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onDecide("select")}>
              {t("selection.card.select")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDecide("reject")}
            >
              {t("selection.card.reject")}
            </Button>
          </div>
        )}
      </div>
      <div id={rosterId} hidden={!rosterOpen}>
        {rosterOpen && <TeamRoster teamId={team.id} />}
      </div>
      {proposal.status.code === "selected" && (
        <MilestonesBlock
          taskId={taskId}
          proposalId={proposal.id}
          milestones={proposal.milestones}
        />
      )}
    </Card>
  );
};
