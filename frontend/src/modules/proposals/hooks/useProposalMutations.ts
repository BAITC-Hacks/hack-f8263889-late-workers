import { authKeys } from "@/modules/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createProposal,
  updateProposal,
  withdrawProposal,
} from "../api/proposals";
import { replaceProposal } from "../helpers";
import { proposalsKeys } from "../queryKeys";
import type {
  Proposal,
  ProposalCreateInput,
  ProposalUpdateInput,
} from "../types";

/**
 * Besides this module's lists, a proposal changes the task's response count
 * in the catalog, so everything except the session is refetched.
 */
const useRefreshAfterChange = () => {
  const queryClient = useQueryClient();
  return (proposal: Proposal) => {
    queryClient.setQueryData(proposalsKeys.detail(proposal.id), proposal);
    queryClient.setQueryData<Proposal[]>(
      proposalsKeys.mine(),
      (items) => items && replaceProposal(items, proposal)
    );
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== authKeys.all[0],
    });
  };
};

export const useCreateProposal = (taskId: number) =>
  useMutation({
    mutationFn: (input: ProposalCreateInput) => createProposal(taskId, input),
    onSuccess: useRefreshAfterChange(),
  });

export const useUpdateProposal = (id: number) =>
  useMutation({
    mutationFn: (input: ProposalUpdateInput) => updateProposal(id, input),
    onSuccess: useRefreshAfterChange(),
  });

export const useWithdrawProposal = () =>
  useMutation({
    mutationFn: withdrawProposal,
    onSuccess: useRefreshAfterChange(),
  });
