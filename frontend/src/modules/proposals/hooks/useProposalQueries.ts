import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery } from "@tanstack/react-query";

import {
  getMyProposals,
  getProposal,
  getTaskHeader,
  getTaskMyProposals,
} from "../api/proposals";
import { proposalsKeys } from "../queryKeys";

export const useMyProposals = () =>
  useQuery({
    queryKey: proposalsKeys.mine(),
    queryFn: ({ signal }) => getMyProposals(signal),
    retry: retryUnlessClientError,
  });

export const useTaskMyProposals = (taskId: number | null) =>
  useQuery({
    queryKey: proposalsKeys.byTask(taskId ?? 0),
    queryFn: ({ signal }) => getTaskMyProposals(taskId!, signal),
    enabled: taskId !== null,
    retry: retryUnlessClientError,
  });

/** `null` is a malformed id from the address: nothing to request. */
export const useProposal = (id: number | null) =>
  useQuery({
    queryKey: proposalsKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getProposal(id!, signal),
    enabled: id !== null,
    retry: retryUnlessClientError,
  });

export const useTaskHeader = (taskId: number | null) =>
  useQuery({
    queryKey: proposalsKeys.taskHeader(taskId ?? 0),
    queryFn: ({ signal }) => getTaskHeader(taskId!, signal),
    enabled: taskId !== null,
    retry: retryUnlessClientError,
  });
