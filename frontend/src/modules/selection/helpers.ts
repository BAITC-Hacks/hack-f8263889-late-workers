import { getFieldErrors, isApiError } from "@/core/api";
import type { ProposalStatusCode } from "@/modules/proposals";

import type {
  BusinessProposal,
  DecisionResponse,
  TaskProposalsPage,
} from "./types";

/** Server-side team size limit; the business view has no `membersLimit`. */
export const TEAM_MEMBERS_LIMIT = 5;
export const CARD_TAGS = 6;
export const COMMENT_MAX = 1000;
export const MILESTONE_TITLE_MIN = 3;
export const MILESTONE_TITLE_MAX = 200;
export const COMPARE_MAX = 3;
export const COMPARE_MIN = 2;

/** Focus targets after a decision removes the button that was focused. */
export const proposalHeadingId = (id: number) => `proposal-${id}-team`;
export const compareHeadingId = (id: number) => `compare-${id}-team`;

export const TABS = ["all", "pending", "selected", "rejected"] as const;
export type ProposalsTab = (typeof TABS)[number];

const TAB_STATUSES: Record<
  Exclude<ProposalsTab, "all">,
  ProposalStatusCode[]
> = {
  pending: ["sent", "reviewing"],
  selected: ["selected"],
  rejected: ["rejected"],
};

const inTab = (proposal: BusinessProposal, tab: ProposalsTab) =>
  tab === "all" || TAB_STATUSES[tab].includes(proposal.status.code);

export const filterByTab = (items: BusinessProposal[], tab: ProposalsTab) =>
  items.filter((proposal) => inTab(proposal, tab));

export const tabCounts = (items: BusinessProposal[]) =>
  Object.fromEntries(
    TABS.map((tab) => [tab, filterByTab(items, tab).length])
  ) as Record<ProposalsTab, number>;

/** Decisions are final: only undecided proposals can be selected or rejected. */
export const canDecide = (proposal: BusinessProposal) =>
  TAB_STATUSES.pending.includes(proposal.status.code);

/** Every proposal with the shortest duration, so ties are all marked. */
export const shortestIds = (items: BusinessProposal[]) => {
  const min = Math.min(...items.map((proposal) => proposal.durationWeeks));
  return new Set(
    items
      .filter((proposal) => proposal.durationWeeks === min)
      .map((proposal) => proposal.id)
  );
};

/** The compared proposals that are still in the list, in list order. */
export const comparedProposals = (
  items: BusinessProposal[],
  ids: ReadonlySet<number>
) => items.filter((proposal) => ids.has(proposal.id));

export const toggleCompare = (
  ids: ReadonlySet<number>,
  id: number
): Set<number> => {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/**
 * Replaces one proposal and carries its team's points to the team's other
 * proposals: points are the team's total, not per proposal.
 */
export const applyProposal = (
  page: TaskProposalsPage,
  next: BusinessProposal
): TaskProposalsPage => ({
  ...page,
  items: page.items.map((proposal) => {
    if (proposal.id === next.id) return next;
    if (proposal.team.id === next.team.id)
      return {
        ...proposal,
        team: { ...proposal.team, points: next.team.points },
      };
    return proposal;
  }),
});

export const applyDecision = (
  page: TaskProposalsPage,
  { proposal, taskStatus }: DecisionResponse
): TaskProposalsPage => ({
  ...applyProposal(page, proposal),
  task: { ...page.task, status: taskStatus },
});

export const withoutMilestone = (
  page: TaskProposalsPage,
  milestoneId: number
): TaskProposalsPage => ({
  ...page,
  items: page.items.map((proposal) =>
    proposal.milestones.some((milestone) => milestone.id === milestoneId)
      ? {
          ...proposal,
          milestones: proposal.milestones.filter(
            (milestone) => milestone.id !== milestoneId
          ),
        }
      : proposal
  ),
});

/** i18n key of the comment error, or `undefined` when it is fine. */
export const validateComment = (comment: string) =>
  comment.trim().length > COMMENT_MAX ? "selection.errors.comment" : undefined;

export const validateMilestoneTitle = (title: string) => {
  const length = title.trim().length;
  return length < MILESTONE_TITLE_MIN || length > MILESTONE_TITLE_MAX
    ? "selection.errors.milestoneTitle"
    : undefined;
};

export const commentOrNull = (comment: string) => comment.trim() || null;

/**
 * Where an action's failure is shown. `conflict` (409) also means the list
 * is out of date and must be refetched.
 */
export const actionError = (
  error: unknown,
  field: string,
  fallback: string
): { field?: string; form?: string; conflict?: boolean } => {
  if (!isApiError(error)) return { form: fallback };
  if (error.status === 422) {
    const message = getFieldErrors(error)[field];
    return message ? { field: message } : { form: error.message };
  }
  if (error.status === 409) return { form: error.message, conflict: true };
  return { form: fallback };
};
