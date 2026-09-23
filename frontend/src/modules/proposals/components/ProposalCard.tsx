import { Button, Card, ClampedText } from "@/common/components/ui";
import { formatDateTime } from "@/core/api";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { Proposal } from "../types";
import { MilestonesSummary } from "./MilestonesSummary";
import { StatusBadge } from "./StatusBadge";

type ProposalCardProps = {
  proposal: Proposal;
  onWithdraw: (proposal: Proposal) => void;
};

export const ProposalCard = ({ proposal, onWithdraw }: ProposalCardProps) => {
  const { t, i18n } = useTranslation();
  const titleId = useId();

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      className="flex flex-col gap-4 p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={proposal.status} />
        <span className="text-muted-foreground text-sm">
          {proposal.team.name}
        </span>
      </div>
      <div className="space-y-1">
        <h2 id={titleId} className="text-base leading-snug font-semibold">
          <Link
            to={`/catalog/${proposal.task.id}`}
            className="hover:text-primary transition-colors"
          >
            {proposal.task.title}
          </Link>
        </h2>
        <p className="text-muted-foreground text-sm">
          {proposal.task.companyName}
        </p>
      </div>
      <ClampedText text={proposal.idea} />
      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          {t("proposals.card.weeks", { count: proposal.durationWeeks })}
        </span>
        <span>
          {t("proposals.card.sentAt", {
            date: formatDateTime(proposal.createdAt, i18n.language, {
              dateStyle: "medium",
            }),
          })}
        </span>
      </p>
      {proposal.canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/student/proposals/${proposal.id}/edit`}>
              {t("proposals.card.edit")}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onWithdraw(proposal)}
          >
            {t("proposals.card.withdraw")}
          </Button>
        </div>
      )}
      {proposal.businessComment !== null && (
        <p className="border-t pt-4 text-sm">
          <span className="font-medium">
            {t("proposals.card.businessComment")}
          </span>{" "}
          {proposal.businessComment}
        </p>
      )}
      {proposal.status.code === "selected" && (
        <MilestonesSummary milestones={proposal.milestones} />
      )}
    </Card>
  );
};
