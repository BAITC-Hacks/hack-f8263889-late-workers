import { apiClient } from "@/core/api";

import type {
  Proposal,
  ProposalCreateInput,
  ProposalResponse,
  ProposalUpdateInput,
  ProposalsResponse,
  TaskHeader,
} from "../types";

export const createProposal = async (
  taskId: number,
  input: ProposalCreateInput
): Promise<Proposal> => {
  const { data } = await apiClient.post<ProposalResponse>(
    `/tasks/${taskId}/proposals`,
    input
  );
  return data.proposal;
};

export const getProposal = async (
  id: number,
  signal?: AbortSignal
): Promise<Proposal> => {
  const { data } = await apiClient.get<ProposalResponse>(`/proposals/${id}`, {
    signal,
  });
  return data.proposal;
};

export const updateProposal = async (
  id: number,
  input: ProposalUpdateInput
): Promise<Proposal> => {
  const { data } = await apiClient.patch<ProposalResponse>(
    `/proposals/${id}`,
    input
  );
  return data.proposal;
};

export const withdrawProposal = async (id: number): Promise<Proposal> => {
  const { data } = await apiClient.post<ProposalResponse>(
    `/proposals/${id}/withdraw`
  );
  return data.proposal;
};

export const getMyProposals = async (
  signal?: AbortSignal
): Promise<Proposal[]> => {
  const { data } = await apiClient.get<ProposalsResponse>("/me/proposals", {
    signal,
  });
  return data.items;
};

export const getTaskMyProposals = async (
  taskId: number,
  signal?: AbortSignal
): Promise<Proposal[]> => {
  const { data } = await apiClient.get<ProposalsResponse>(
    `/tasks/${taskId}/my-proposals`,
    { signal }
  );
  return data.items;
};

export const getTaskHeader = async (
  taskId: number,
  signal?: AbortSignal
): Promise<TaskHeader> => {
  const { data } = await apiClient.get<{ task: TaskHeader }>(
    `/tasks/${taskId}`,
    { signal }
  );
  const { id, title, companyName, rating } = data.task;
  return { id, title, companyName, rating };
};
