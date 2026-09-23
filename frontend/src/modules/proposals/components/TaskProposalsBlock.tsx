import { Button, ErrorState } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { sectionTitle, skeleton } from "@/common/styles";
import { useMyTeams } from "@/modules/teams";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { candidateTeams, captainTeams } from "../helpers";
import { useTaskMyProposals } from "../hooks/useProposalQueries";
import { StatusBadge } from "./StatusBadge";

/** Student-only: the user's teams' proposals for a task and the way to add one. */
export const TaskProposalsBlock = ({ taskId }: { taskId: number }) => {
  const { t } = useTranslation();
  const proposals = useTaskMyProposals(taskId);
  const teams = useMyTeams();

  const renderBody = () => {
    if (proposals.isPending || teams.isPending)
      return (
        <div
          aria-busy="true"
          aria-label={t("common.loading")}
          className="space-y-2"
        >
          <div className={cn(skeleton, "h-5 w-2/3")} />
          <div className={cn(skeleton, "h-9 w-40")} />
        </div>
      );
    if (proposals.isError || teams.isError)
      return (
        <ErrorState
          message={t("proposals.loadFailed")}
          onRetry={() => {
            if (proposals.isError) void proposals.refetch();
            if (teams.isError) void teams.refetch();
          }}
        />
      );

    const candidates = candidateTeams(teams.data, proposals.data);
    const isCaptain = captainTeams(teams.data).length > 0;

    return (
      <div className="space-y-4">
        {proposals.data.length > 0 && (
          <ul className="divide-y border-y">
            {proposals.data.map((proposal) => (
              <li
                key={proposal.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
              >
                <span className="font-medium">{proposal.team.name}</span>
                <StatusBadge status={proposal.status} />
                <Link
                  to="/student/proposals"
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {t("proposals.open")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {candidates.length > 0 && (
          <Button asChild>
            <Link to={`/catalog/${taskId}/proposal`}>
              <Send aria-hidden="true" />
              {t("proposals.respond")}
            </Link>
          </Button>
        )}
        {!isCaptain && (
          <p className="text-muted-foreground text-sm">
            {t("proposals.captainOnly")}{" "}
            <Link
              to="/student/teams/new"
              className="text-primary font-medium hover:underline"
            >
              {t("teams.create")}
            </Link>
          </p>
        )}
      </div>
    );
  };

  return (
    <section aria-labelledby="task-proposals-title" className="space-y-4">
      <h2 id="task-proposals-title" className={sectionTitle}>
        {t("proposals.taskBlockTitle")}
      </h2>
      {renderBody()}
    </section>
  );
};
