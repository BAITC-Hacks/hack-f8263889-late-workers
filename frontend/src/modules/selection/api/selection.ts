import { apiClient } from "@/core/api";

import type {
  BusinessProposal,
  BusinessProposalResponse,
  DecisionInput,
  DecisionResponse,
  MilestoneInput,
  TaskProposalsPage,
  Verdict,
} from "../types";

/** Opening the list moves the task's `sent` proposals to `reviewing`. */
export const getTaskProposals = async (
  taskId: number,
  signal?: AbortSignal
): Promise<TaskProposalsPage> => {
  const { data } = await apiClient.get<TaskProposalsPage>(
    `/business/tasks/${taskId}/proposals`,
    { signal }
  );
  return data;
};

const decide = async (
  verdict: Verdict,
  proposalId: number,
  input: DecisionInput
): Promise<DecisionResponse> => {
  const { data } = await apiClient.post<DecisionResponse>(
    `/business/proposals/${proposalId}/${verdict}`,
    input
  );
  return data;
};

export const selectProposal = (proposalId: number, input: DecisionInput) =>
  decide("select", proposalId, input);

export const rejectProposal = (proposalId: number, input: DecisionInput) =>
  decide("reject", proposalId, input);

export const createMilestone = async (
  proposalId: number,
  input: MilestoneInput
): Promise<BusinessProposal> => {
  const { data } = await apiClient.post<BusinessProposalResponse>(
    `/business/proposals/${proposalId}/milestones`,
    input
  );
  return data.proposal;
};

export const confirmMilestone = async (
  milestoneId: number
): Promise<BusinessProposal> => {
  const { data } = await apiClient.post<BusinessProposalResponse>(
    `/business/milestones/${milestoneId}/confirm`
  );
  return data.proposal;
};

export const deleteMilestone = async (milestoneId: number): Promise<void> => {
  await apiClient.delete(`/business/milestones/${milestoneId}`);
};
