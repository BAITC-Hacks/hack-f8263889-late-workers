import { ErrorState } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import { MemberList, useTeam } from "@/modules/teams";
import { useTranslation } from "react-i18next";

/** Mounted only when opened, so the team is fetched on demand. */
export const TeamRoster = ({ teamId }: { teamId: number }) => {
  const { t } = useTranslation();
  const team = useTeam(teamId);

  if (team.isPending)
    return (
      <div
        aria-busy="true"
        aria-label={t("common.loading")}
        className="space-y-2"
      >
        <div className={cn(skeleton, "h-12 w-full")} />
        <div className={cn(skeleton, "h-12 w-full")} />
      </div>
    );
  if (team.isError)
    return (
      <ErrorState
        message={t("selection.card.rosterFailed")}
        onRetry={() => void team.refetch()}
      />
    );
  return <MemberList members={team.data.members} />;
};
