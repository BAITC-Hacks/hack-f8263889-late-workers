import type { BadgeProps } from "@/common/components/ui";
import { isApiError } from "@/core/api";
import type { TeamSummary } from "@/modules/teams";

import type {
  Milestone,
  Proposal,
  ProposalCreateInput,
  ProposalFormValues,
  ProposalStatusCode,
  ProposalUpdateInput,
} from "./types";

export const IDEA_MAX = 2000;
export const PLAN_MAX = 3000;
const TEXT_MIN = 20;
const WEEKS_MIN = 1;
const WEEKS_MAX = 52;
const URL_MAX = 500;
/** Below this rating the business may still ask clarifying questions. */
export const RATING_WARNING_BELOW = 40;

const ACTIVE: ProposalStatusCode[] = ["sent", "reviewing", "selected"];
export const isActiveProposal = (proposal: Proposal) =>
  ACTIVE.includes(proposal.status.code);

const STATUS_BADGE: Record<ProposalStatusCode, BadgeProps["variant"]> = {
  sent: "muted",
  reviewing: "primary",
  selected: "success",
  rejected: "destructive",
  withdrawn: "muted",
};
export const statusBadgeVariant = (code: ProposalStatusCode) =>
  STATUS_BADGE[code] ?? "muted";

export const captainTeams = (teams: TeamSummary[]) =>
  teams.filter((team) => team.myRole === "captain");

/** Teams the user captains that have no active proposal for the task yet. */
export const candidateTeams = (
  teams: TeamSummary[],
  taskProposals: Proposal[]
) => {
  const busy = new Set(
    taskProposals.filter(isActiveProposal).map((proposal) => proposal.team.id)
  );
  return captainTeams(teams).filter((team) => !busy.has(team.id));
};

export const needsClarification = (rating: number) =>
  rating < RATING_WARNING_BELOW;

type FormErrors = Partial<Record<keyof ProposalFormValues, string>>;

export const validateProposal = (
  values: ProposalFormValues,
  withTeam: boolean
): FormErrors => {
  const errors: FormErrors = {};
  if (withTeam && !values.teamId) errors.teamId = "proposals.errors.teamId";
  const idea = values.idea.trim().length;
  if (idea < TEXT_MIN || idea > IDEA_MAX) errors.idea = "proposals.errors.idea";
  const plan = values.plan.trim().length;
  if (plan < TEXT_MIN || plan > PLAN_MAX) errors.plan = "proposals.errors.plan";
  const weeks = values.durationWeeks.trim();
  if (
    !/^\d+$/.test(weeks) ||
    Number(weeks) < WEEKS_MIN ||
    Number(weeks) > WEEKS_MAX
  )
    errors.durationWeeks = "proposals.errors.durationWeeks";
  const url = values.prototypeUrl.trim();
  if (url && !/^https?:\/\//i.test(url))
    errors.prototypeUrl = "proposals.errors.prototypeUrl";
  else if (url.length > URL_MAX)
    errors.prototypeUrl = "proposals.errors.prototypeUrlLong";
  return errors;
};

export const toUpdateInput = (
  values: ProposalFormValues
): ProposalUpdateInput => ({
  idea: values.idea.trim(),
  plan: values.plan.trim(),
  durationWeeks: Number(values.durationWeeks.trim()),
  prototypeUrl: values.prototypeUrl.trim() || null,
});

export const toCreateInput = (
  values: ProposalFormValues
): ProposalCreateInput => ({
  teamId: Number(values.teamId),
  ...toUpdateInput(values),
});

export const proposalToValues = (proposal: Proposal): ProposalFormValues => ({
  teamId: String(proposal.team.id),
  idea: proposal.idea,
  plan: proposal.plan,
  durationWeeks: String(proposal.durationWeeks),
  prototypeUrl: proposal.prototypeUrl ?? "",
});

export const emptyProposalValues = (teamId = ""): ProposalFormValues => ({
  teamId,
  idea: "",
  plan: "",
  durationWeeks: "",
  prototypeUrl: "",
});

/**
 * Form-level text for a failed submit that is not a field error.
 * `exists` asks the form to link to the team's active proposal.
 */
export const submitError = (
  error: unknown,
  fallback: string,
  existsMessage: string
): { message: string; exists?: boolean } => {
  if (isApiError(error) && error.code === "PROPOSAL_EXISTS")
    return { message: existsMessage, exists: true };
  if (isApiError(error) && error.code === "INVALID_STATUS")
    return { message: error.message };
  return { message: fallback };
};

/** Teams that appear in the list, in first-seen order, for the filter. */
export const proposalTeams = (proposals: Proposal[]) => {
  const seen = new Map<number, string>();
  for (const { team } of proposals)
    if (!seen.has(team.id)) seen.set(team.id, team.name);
  return [...seen].map(([id, name]) => ({ id, name }));
};

export const filterByTeam = (proposals: Proposal[], teamId: number | null) =>
  teamId === null
    ? proposals
    : proposals.filter((proposal) => proposal.team.id === teamId);

export const replaceProposal = (proposals: Proposal[], next: Proposal) =>
  proposals.map((proposal) => (proposal.id === next.id ? next : proposal));

/** Points the team earned on one proposal: confirmed milestones only. */
export const earnedPoints = (milestones: Milestone[]) =>
  milestones.reduce(
    (sum, milestone) => (milestone.confirmed ? sum + milestone.points : sum),
    0
  );
