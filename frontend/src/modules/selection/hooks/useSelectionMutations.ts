import { catalogKeys } from "@/modules/catalog";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  confirmMilestone,
  createMilestone,
  deleteMilestone,
  rejectProposal,
  selectProposal,
} from "../api/selection";
import { applyDecision, applyProposal, withoutMilestone } from "../helpers";
import { selectionKeys } from "../queryKeys";
import type { BusinessProposal, TaskProposalsPage, Verdict } from "../types";

type DecisionVariables = {
  verdict: Verdict;
  proposalId: number;
  comment: string | null;
};

const usePatchPage = (taskId: number) => {
  const queryClient = useQueryClient();
  return (patch: (page: TaskProposalsPage) => TaskProposalsPage) =>
    queryClient.setQueryData<TaskProposalsPage>(
      selectionKeys.task(taskId),
      (page) => page && patch(page)
    );
};

export const useDecision = (taskId: number) => {
  const queryClient = useQueryClient();
  const patchPage = usePatchPage(taskId);
  return useMutation({
    mutationFn: ({ verdict, proposalId, comment }: DecisionVariables) =>
      (verdict === "select" ? selectProposal : rejectProposal)(proposalId, {
        comment,
      }),
    onSuccess: (response) => {
      patchPage((page) => applyDecision(page, response));
      // Selecting can move the task to "in progress" in the catalog and
      // the business's task list.
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
};

export const useAddMilestone = (taskId: number, proposalId: number) => {
  const patchPage = usePatchPage(taskId);
  return useMutation({
    mutationFn: (title: string) => createMilestone(proposalId, { title }),
    onSuccess: (proposal: BusinessProposal) =>
      patchPage((page) => applyProposal(page, proposal)),
  });
};

export const useConfirmMilestone = (taskId: number) => {
  const patchPage = usePatchPage(taskId);
  return useMutation({
    mutationFn: confirmMilestone,
    onSuccess: (proposal) => patchPage((page) => applyProposal(page, proposal)),
  });
};

export const useDeleteMilestone = (taskId: number) => {
  const patchPage = usePatchPage(taskId);
  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: (_data, milestoneId) =>
      patchPage((page) => withoutMilestone(page, milestoneId)),
  });
};
