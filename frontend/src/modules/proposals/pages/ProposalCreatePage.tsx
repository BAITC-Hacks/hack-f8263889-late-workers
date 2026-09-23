import { Stack } from "@/common/components/layout";
import { Button, Card, ErrorState } from "@/common/components/ui";
import { isNotFound, parseId } from "@/common/lib/query";
import { pageTitle } from "@/common/styles";
import { useMyTeams } from "@/modules/teams";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { FormPageShell, FormPageSkeleton } from "../components/FormPageShell";
import { ProposalForm } from "../components/ProposalForm";
import { TaskHeading } from "../components/TaskHeading";
import {
  candidateTeams,
  captainTeams,
  emptyProposalValues,
  toCreateInput,
} from "../helpers";
import { useProposalForm } from "../hooks/useProposalForm";
import { useCreateProposal } from "../hooks/useProposalMutations";
import { useTaskHeader, useTaskMyProposals } from "../hooks/useProposalQueries";
import type { TaskHeader } from "../types";

export const ProposalCreatePage = () => {
  const { t } = useTranslation();
  const taskId = parseId(useParams().id);
  const task = useTaskHeader(taskId);
  const teams = useMyTeams();
  const taskProposals = useTaskMyProposals(taskId);
  const back = {
    to: taskId ? `/catalog/${taskId}` : "/catalog",
    label: t("proposals.form.backToTask"),
  };

  const renderBody = () => {
    if (taskId === null || (task.isError && isNotFound(task.error)))
      return (
        <Stack gap="md">
          <h1 className={pageTitle}>{t("task.notFound")}</h1>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/catalog">{t("task.toCatalog")}</Link>
            </Button>
          </div>
        </Stack>
      );
    if (task.isPending || teams.isPending || taskProposals.isPending)
      return <FormPageSkeleton />;
    if (task.isError || teams.isError || taskProposals.isError)
      return (
        <ErrorState
          message={t("proposals.form.loadFailed")}
          onRetry={() => {
            if (task.isError) void task.refetch();
            if (teams.isError) void teams.refetch();
            if (taskProposals.isError) void taskProposals.refetch();
          }}
        />
      );

    const candidates = candidateTeams(teams.data, taskProposals.data);
    if (candidates.length === 0)
      return (
        <Stack gap="md">
          <TaskHeading task={task.data} />
          <p className="text-muted-foreground text-sm">
            {captainTeams(teams.data).length === 0
              ? t("proposals.captainOnly")
              : t("proposals.form.allTeamsResponded")}
          </p>
        </Stack>
      );
    return <CreateForm task={task.data} teams={candidates} />;
  };

  return <FormPageShell back={back}>{renderBody()}</FormPageShell>;
};

type CreateFormProps = {
  task: TaskHeader;
  teams: { id: number; name: string }[];
};

const CreateForm = ({ task, teams }: CreateFormProps) => {
  const { t } = useTranslation();
  const create = useCreateProposal(task.id);
  const form = useProposalForm({
    defaultValues: emptyProposalValues(
      teams.length === 1 ? String(teams[0].id) : ""
    ),
    withTeam: true,
    submit: (values) => create.mutateAsync(toCreateInput(values)),
    successKey: "proposals.form.sent",
  });

  return (
    <>
      <TaskHeading task={task} />
      <Card className="p-6 sm:p-8">
        <ProposalForm
          form={form}
          teams={teams}
          submitLabel={t("proposals.form.submit")}
        />
      </Card>
    </>
  );
};
