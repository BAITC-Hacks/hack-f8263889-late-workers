import { getFieldErrors, isApiError } from "@/core/api";

import type { Team, TeamInput } from "./types";

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 60;
export const CARD_TAGS = 5;

export const validateTeam = (
  input: TeamInput
): Partial<Record<keyof TeamInput, string>> => {
  const length = input.name.trim().length;
  return length < TEAM_NAME_MIN || length > TEAM_NAME_MAX
    ? { name: "teams.errors.nameInvalid" }
    : {};
};

export const normalizeTeamInput = (input: TeamInput): TeamInput => ({
  name: input.name.trim(),
  interests: input.interests.map((tag) => tag.trim()),
  ownSkills: input.ownSkills.map((tag) => tag.trim()),
  ownTechnologies: input.ownTechnologies.map((tag) => tag.trim()),
});

export const emptyTeamInput: TeamInput = {
  name: "",
  interests: [],
  ownSkills: [],
  ownTechnologies: [],
};

export const teamToInput = (team: Team): TeamInput => ({
  name: team.name,
  interests: team.interests,
  ownSkills: team.ownSkills,
  ownTechnologies: team.ownTechnologies,
});

/** Skills first, then technologies, capped for a compact card. */
export const cardTags = (skills: string[], technologies: string[]) => {
  const all = [...skills, ...technologies];
  return { shown: all.slice(0, CARD_TAGS), hidden: all.length - CARD_TAGS };
};

export const isTeamFull = (team: Team) =>
  team.members.length >= team.membersLimit;

export const withoutMember = (team: Team, studentId: number): Team => ({
  ...team,
  members: team.members.filter((member) => member.studentId !== studentId),
});

/** Where an add-member failure is shown: under the field or above the form. */
export const addMemberError = (
  error: unknown,
  fallback: string
): { field?: string; form?: string } => {
  if (!isApiError(error)) return { form: fallback };
  if (error.status === 422) {
    const fields = getFieldErrors(error);
    return fields.email ? { field: fields.email } : { form: error.message };
  }
  if (error.status === 409) return { form: error.message };
  return { form: fallback };
};
