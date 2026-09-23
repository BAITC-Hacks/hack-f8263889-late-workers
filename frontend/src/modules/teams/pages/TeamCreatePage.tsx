import { Page, Stack } from "@/common/components/layout";
import { Card } from "@/common/components/ui";
import { inlineLink, pageTitle } from "@/common/styles";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { TeamForm } from "../components/TeamForm";
import { emptyTeamInput } from "../helpers";
import { useTeamForm } from "../hooks/useTeamForm";
import { useCreateTeam } from "../hooks/useTeamMutations";

export const TeamCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateTeam();
  const form = useTeamForm({
    defaultValues: emptyTeamInput,
    submit: create.mutateAsync,
    onSaved: (team) => navigate(`/student/teams/${team.id}`),
    failedKey: "teams.createFailed",
  });

  return (
    <Page>
      <Stack gap="lg" className="max-w-xl">
        <Link to="/student/teams" className={inlineLink}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("teams.myTeams")}
        </Link>
        <h1 className={pageTitle}>{t("teams.newTitle")}</h1>
        <Card className="p-6 sm:p-8">
          <TeamForm form={form} submitLabel={t("teams.form.create")} />
        </Card>
      </Stack>
    </Page>
  );
};
