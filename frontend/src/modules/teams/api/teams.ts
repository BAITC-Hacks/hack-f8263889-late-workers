import { apiClient } from "@/core/api";

import type {
  AddMemberInput,
  Team,
  TeamInput,
  TeamResponse,
  TeamSummary,
  TeamsResponse,
} from "../types";

export const createTeam = async (input: TeamInput): Promise<Team> => {
  const { data } = await apiClient.post<TeamResponse>("/teams", input);
  return data.team;
};

export const getMyTeams = async (
  signal?: AbortSignal
): Promise<TeamSummary[]> => {
  const { data } = await apiClient.get<TeamsResponse>("/teams/my", { signal });
  return data.items;
};

export const getTeam = async (
  id: number,
  signal?: AbortSignal
): Promise<Team> => {
  const { data } = await apiClient.get<TeamResponse>(`/teams/${id}`, {
    signal,
  });
  return data.team;
};

export const updateTeam = async (
  id: number,
  input: TeamInput
): Promise<Team> => {
  const { data } = await apiClient.patch<TeamResponse>(`/teams/${id}`, input);
  return data.team;
};

export const addMember = async (
  id: number,
  input: AddMemberInput
): Promise<Team> => {
  const { data } = await apiClient.post<TeamResponse>(
    `/teams/${id}/members`,
    input
  );
  return data.team;
};

export const removeMember = async (
  id: number,
  studentId: number
): Promise<void> => {
  await apiClient.delete(`/teams/${id}/members/${studentId}`);
};
