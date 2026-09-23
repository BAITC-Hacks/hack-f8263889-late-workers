import { Page, Stack } from "@/common/components/layout";
import { Button, ErrorState } from "@/common/components/ui";
import { cardGrid, pageTitle } from "@/common/styles";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { TeamCardSkeletons } from "../components/Skeletons";
import { TeamCard } from "../components/TeamCard";
import { useMyTeams } from "../hooks/useMyTeams";

const SKELETON_CARDS = 3;

const CreateTeamLink = () => {
  const { t } = useTranslation();
  return (
    <Button asChild>
      <Link to="/student/teams/new">
        <Plus aria-hidden="true" />
        {t("teams.create")}
      </Link>
    </Button>
  );
};

export const TeamsPage = () => {
  const { t } = useTranslation();
  const teams = useMyTeams();

  const renderTeams = () => {
    if (teams.isPending) return <TeamCardSkeletons count={SKELETON_CARDS} />;
    if (teams.isError)
      return (
        <ErrorState
          message={t("teams.loadFailed")}
          onRetry={() => void teams.refetch()}
        />
      );
    if (teams.data.length === 0)
      return (
        <Stack gap="md">
          <p className="text-muted-foreground text-sm">{t("teams.empty")}</p>
          <div>
            <CreateTeamLink />
          </div>
        </Stack>
      );
    return (
      <div className={cardGrid}>
        {teams.data.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    );
  };

  const hasTeams = teams.isSuccess && teams.data.length > 0;

  return (
    <Page>
      <Stack gap="xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className={pageTitle}>{t("teams.title")}</h1>
          {hasTeams && <CreateTeamLink />}
        </div>
        {renderTeams()}
      </Stack>
    </Page>
  );
};
