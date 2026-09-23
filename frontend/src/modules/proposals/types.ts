export const PROPOSAL_STATUSES = [
  "sent",
  "reviewing",
  "selected",
  "rejected",
  "withdrawn",
] as const;
export type ProposalStatusCode = (typeof PROPOSAL_STATUSES)[number];

export type ProposalTask = {
  id: number;
  title: string;
  companyName: string;
  rating: number;
  level: { code: string; name: string };
};

export type Proposal = {
  id: number;
  task: ProposalTask;
  team: { id: number; name: string };
  author: { studentId: number; name: string };
  status: { code: ProposalStatusCode; name: string };
  idea: string;
  plan: string;
  durationWeeks: number;
  prototypeUrl: string | null;
  businessComment: string | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
};

export type ProposalUpdateInput = {
  idea: string;
  plan: string;
  durationWeeks: number;
  prototypeUrl: string | null;
};

export type ProposalCreateInput = ProposalUpdateInput & { teamId: number };

/** What the form edits: inputs hold strings until submission. */
export type ProposalFormValues = {
  teamId: string;
  idea: string;
  plan: string;
  durationWeeks: string;
  prototypeUrl: string;
};

/** The part of `GET /api/tasks/:id` the proposal form header needs. */
export type TaskHeader = Pick<
  ProposalTask,
  "id" | "title" | "companyName" | "rating"
>;

export type ProposalResponse = { proposal: Proposal };
export type ProposalsResponse = { items: Proposal[] };
