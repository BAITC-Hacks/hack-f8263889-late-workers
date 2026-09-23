import { Page, Stack } from "@/common/components/layout";
import {
  Button,
  ConfirmDialog,
  ErrorState,
  Select,
} from "@/common/components/ui";
import { fieldLabel, pageTitle } from "@/common/styles";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ProposalCard } from "../components/ProposalCard";
import { ProposalCardSkeletons } from "../components/ProposalCardSkeletons";
import { filterByTeam, proposalTeams } from "../helpers";
import { useWithdrawProposal } from "../hooks/useProposalMutations";
import { useMyProposals } from "../hooks/useProposalQueries";
import type { Proposal } from "../types";

const SKELETON_CARDS = 3;

export const MyProposalsPage = () => {
  const { t } = useTranslation();
  const proposals = useMyProposals();
  const withdraw = useWithdrawProposal();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [withdrawing, setWithdrawing] = useState<Proposal | null>(null);

  const closeDialog = () => {
    withdraw.reset();
    setWithdrawing(null);
  };

  const renderList = () => {
    if (proposals.isPending)
      return <ProposalCardSkeletons count={SKELETON_CARDS} />;
    if (proposals.isError)
      return (
        <ErrorState
          message={t("proposals.loadFailed")}
          onRetry={() => void proposals.refetch()}
        />
      );
    if (proposals.data.length === 0)
      return (
        <Stack gap="md">
          <p className="text-muted-foreground text-sm">
            {t("proposals.empty")}
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/catalog">{t("saved.goCatalog")}</Link>
            </Button>
          </div>
        </Stack>
      );

    const teams = proposalTeams(proposals.data);
    const selected = teams.some((team) => team.id === teamId) ? teamId : null;
    return (
      <Stack gap="lg">
        {teams.length > 1 && (
          <div className="max-w-xs space-y-1">
            <label htmlFor="proposal-team" className={fieldLabel}>
              {t("proposals.filter.label")}
            </label>
            <Select
              id="proposal-team"
              value={selected ?? ""}
              onChange={(event) =>
                setTeamId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">{t("proposals.filter.all")}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-4">
          {filterByTeam(proposals.data, selected).map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onWithdraw={setWithdrawing}
            />
          ))}
        </div>
      </Stack>
    );
  };

  return (
    <Page>
      <Stack gap="xl" className="max-w-4xl">
        <h1 className={pageTitle}>{t("proposals.title")}</h1>
        {renderList()}
      </Stack>
      <ConfirmDialog
        open={withdrawing !== null}
        title={t("proposals.withdrawConfirm", {
          title: withdrawing?.task.title,
        })}
        confirmLabel={t("proposals.card.withdraw")}
        destructive
        pending={withdraw.isPending}
        error={withdraw.isError ? t("proposals.withdrawFailed") : undefined}
        onConfirm={() =>
          withdrawing &&
          withdraw.mutate(withdrawing.id, { onSuccess: closeDialog })
        }
        onCancel={closeDialog}
      />
    </Page>
  );
};
