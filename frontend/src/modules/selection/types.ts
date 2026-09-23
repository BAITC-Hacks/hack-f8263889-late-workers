import type { Coded, TaskLevelCode } from "@/modules/catalog";
import type { Milestone, ProposalStatusCode } from "@/modules/proposals";

export type BusinessProposalTeam = {
  id: number;
  name: string;
  membersCount: number;
  skills: string[];
  technologies: string[];
  /** The team's total across all tasks, not just this one. */
  points: number;
};

export type BusinessProposal = {
  id: number;
  status: Coded<ProposalStatusCode>;
  team: BusinessProposalTeam;
  idea: string;
  plan: string;
  durationWeeks: number;
  prototypeUrl: string | null;
  businessComment: string | null;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
};

export type ProposalsTask = {
  id: number;
  title: string;
  status: Coded;
  rating: number;
  level: Coded<TaskLevelCode>;
};

export type TaskProposalsPage = {
  task: ProposalsTask;
  items: BusinessProposal[];
};

export type Verdict = "select" | "reject";
export type DecisionInput = { comment: string | null };
export type DecisionResponse = {
  proposal: BusinessProposal;
  taskStatus: Coded;
};
export type MilestoneInput = { title: string };
export type BusinessProposalResponse = { proposal: BusinessProposal };
