import { Page, Stack } from "@/common/components/layout";
import { Button, ErrorState } from "@/common/components/ui";
import { isNotFound, parseId } from "@/common/lib/query";
import { pageTitle } from "@/common/styles";
import { ProposalCardSkeletons } from "@/modules/proposals";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { BusinessProposalCard } from "../components/BusinessProposalCard";
import { CompareBar } from "../components/CompareBar";
import { CompareDialog } from "../components/CompareDialog";
import { DecisionDialog } from "../components/DecisionDialog";
import { ProposalTabs } from "../components/ProposalTabs";
import {
  BackToTasks,
  PAGE_TITLE_ID,
  ProposalsHeader,
} from "../components/ProposalsHeader";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  type ProposalsTab,
  compareHeadingId,
  comparedProposals,
  filterByTab,
  proposalHeadingId,
  tabCounts,
  toggleCompare,
} from "../helpers";
import { useDecisionFlow } from "../hooks/useDecisionFlow";
import { useTaskProposals } from "../hooks/useTaskProposals";
import type { TaskProposalsPage } from "../types";

const SKELETON_CARDS = 3;

export const BusinessProposalsPage = () => {
  const { t } = useTranslation();
  const taskId = parseId(useParams().id);
  const page = useTaskProposals(taskId);
  const notFound = taskId === null || (page.isError && isNotFound(page.error));

  const renderBody = () => {
    if (notFound)
      return (
        <Stack gap="md">
          <h1 className={pageTitle}>{t("task.notFound")}</h1>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/business">{t("myTasks.title")}</Link>
            </Button>
          </div>
        </Stack>
      );
    if (page.isPending) return <ProposalCardSkeletons count={SKELETON_CARDS} />;
    if (page.isError)
      return (
        <ErrorState
          message={t("selection.loadFailed")}
          onRetry={() => void page.refetch()}
        />
      );
    return <ProposalsList taskId={taskId!} data={page.data} />;
  };

  return (
    <Page>
      <Stack gap="lg" className="max-w-5xl">
        {!notFound && <BackToTasks />}
        {renderBody()}
      </Stack>
    </Page>
  );
};

type ProposalsListProps = { taskId: number; data: TaskProposalsPage };

const ProposalsList = ({ taskId, data }: ProposalsListProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ProposalsTab>("all");
  const [compareIds, setCompareIds] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const compared = comparedProposals(data.items, compareIds);
  const canCompare = compared.length >= COMPARE_MIN;
  // A reload can drop compared proposals (e.g. withdrawn) under an open panel.
  if (compareOpen && !canCompare) setCompareOpen(false);

  // The decided proposal's buttons disappear, so focus would fall to <body>.
  const flow = useDecisionFlow(taskId, (proposalId) => {
    const id = compareOpen
      ? compareHeadingId(proposalId)
      : proposalHeadingId(proposalId);
    (
      document.getElementById(id) ?? document.getElementById(PAGE_TITLE_ID)
    )?.focus();
  });

  const visible = filterByTab(data.items, tab);

  return (
    <Stack gap="lg">
      <ProposalsHeader task={data.task} />
      {data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("selection.empty")}</p>
      ) : (
        <>
          <p className="text-sm">{t("selection.notice")}</p>
          <ProposalTabs
            value={tab}
            counts={tabCounts(data.items)}
            onChange={setTab}
          />
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("selection.emptyTab")}
            </p>
          ) : (
            <div className="space-y-4">
              {visible.map((proposal) => (
                <BusinessProposalCard
                  key={proposal.id}
                  taskId={taskId}
                  proposal={proposal}
                  compared={compareIds.has(proposal.id)}
                  compareFull={compared.length >= COMPARE_MAX}
                  onToggleCompare={() =>
                    setCompareIds(toggleCompare(compareIds, proposal.id))
                  }
                  onDecide={(verdict) =>
                    flow.open({
                      proposalId: proposal.id,
                      teamName: proposal.team.name,
                      verdict,
                    })
                  }
                />
              ))}
            </div>
          )}
          {canCompare && (
            <CompareBar
              count={compared.length}
              onCompare={() => setCompareOpen(true)}
              onClear={() => setCompareIds(new Set())}
            />
          )}
        </>
      )}
      <CompareDialog
        open={compareOpen && canCompare}
        proposals={compared}
        onClose={() => setCompareOpen(false)}
        onDecide={(proposal, verdict) =>
          flow.open({
            proposalId: proposal.id,
            teamName: proposal.team.name,
            verdict,
          })
        }
      />
      <DecisionDialog flow={flow} />
    </Stack>
  );
};
