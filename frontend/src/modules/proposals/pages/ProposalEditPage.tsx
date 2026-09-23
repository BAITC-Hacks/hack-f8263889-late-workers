import { Stack } from "@/common/components/layout";
import { Button, Card, ErrorState } from "@/common/components/ui";
import { isNotFound, parseId } from "@/common/lib/query";
import { pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { FormPageShell, FormPageSkeleton } from "../components/FormPageShell";
import { ProposalForm } from "../components/ProposalForm";
import { TaskHeading } from "../components/TaskHeading";
import { proposalToValues, toUpdateInput } from "../helpers";
import { useProposalForm } from "../hooks/useProposalForm";
import { useUpdateProposal } from "../hooks/useProposalMutations";
import { useProposal } from "../hooks/useProposalQueries";
import type { Proposal } from "../types";

export const ProposalEditPage = () => {
  const { t } = useTranslation();
  const id = parseId(useParams().id);
  const proposal = useProposal(id);

  const renderBody = () => {
    if (id === null || (proposal.isError && isNotFound(proposal.error)))
      return (
        <Stack gap="md">
          <h1 className={pageTitle}>{t("proposals.notFound")}</h1>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/proposals">{t("proposals.title")}</Link>
            </Button>
          </div>
        </Stack>
      );
    if (proposal.isPending) return <FormPageSkeleton />;
    if (proposal.isError)
      return (
        <ErrorState
          message={t("proposals.form.loadFailed")}
          onRetry={() => void proposal.refetch()}
        />
      );
    if (!proposal.data.canEdit)
      return (
        <Stack gap="md">
          <TaskHeading task={proposal.data.task} />
          <p className="text-muted-foreground text-sm">
            {t("proposals.form.locked")}
          </p>
        </Stack>
      );
    return <EditForm key={proposal.data.id} proposal={proposal.data} />;
  };

  return (
    <FormPageShell
      back={{ to: "/student/proposals", label: t("proposals.title") }}
    >
      {renderBody()}
    </FormPageShell>
  );
};

const EditForm = ({ proposal }: { proposal: Proposal }) => {
  const { t } = useTranslation();
  const update = useUpdateProposal(proposal.id);
  const form = useProposalForm({
    defaultValues: proposalToValues(proposal),
    withTeam: false,
    submit: (values) => update.mutateAsync(toUpdateInput(values)),
    successKey: "proposals.form.saved",
  });

  return (
    <>
      <TaskHeading task={proposal.task} />
      <Card className="p-6 sm:p-8">
        <ProposalForm
          form={form}
          teamName={proposal.team.name}
          submitLabel={t("common.save")}
        />
      </Card>
    </>
  );
};
