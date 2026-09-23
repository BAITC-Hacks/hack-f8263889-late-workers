import type {
  Coded,
  Industry,
  TaskFieldKey,
  TaskLevelCode,
} from "@/modules/catalog";
import type { EarnedBadge } from "@/modules/gamification";

export const BLOCK_CODES = [
  "context_need",
  "data",
  "result",
  "success_criteria",
  "constraints",
  "users",
  "business_link",
] as const;
export type BlockCode = (typeof BLOCK_CODES)[number];

export type QualityCode = "missing" | "formal" | "partial" | "specific";

/** `fallback`: the AI was unavailable and the server used its heuristics. */
export type BuilderMode = "ai" | "fallback";

export type BuilderStatusCode =
  | "draft"
  | "clarifying"
  | "review"
  | "published"
  | "in_progress"
  | "unpublished";

export type Assessment = {
  block: BlockCode;
  name: string;
  quality: Coded<QualityCode>;
  reason: string;
};

export type RoundQuestion = {
  id: number;
  block: BlockCode;
  text: string;
  answer: string | null;
  skipped: boolean;
};

export type Round = {
  number: number;
  mode: BuilderMode;
  assessment: Assessment[];
  questions: RoundQuestion[];
  createdAt: string;
  answeredAt: string | null;
};

/** `D*` is a sentence of the draft, `A*` an answer to the question `questionId`. */
export type Fragment = {
  id: string;
  text: string;
  questionId: number | null;
};

export type FieldSource = "ai" | "human" | "profile";

export type CardField = {
  value: string | null;
  source: FieldSource | null;
  confirmed: boolean;
  /** Fragment ids the value was taken from. */
  sources: string[];
};

export type CardFieldKey = TaskFieldKey;

export type Card = {
  mode: BuilderMode;
  title: CardField;
  fields: Record<CardFieldKey, CardField>;
};

export type RatingEntry = {
  block: BlockCode;
  name: string;
  quality: Coded<QualityCode>;
  points: number;
  maxPoints: number;
  reason: string;
  mode: BuilderMode;
};

export type BuilderTask = {
  id: number;
  status: Coded<BuilderStatusCode>;
  industry: Industry;
  draftText: string | null;
  rounds: Round[];
  roundsLeft: number;
  fragments: Fragment[];
  card: Card | null;
  /** Rating, level and breakdown stay null until the card is confirmed. */
  rating: number | null;
  level: Coded<TaskLevelCode> | null;
  ratingBreakdown: RatingEntry[] | null;
  badges: EarnedBadge[];
  confirmedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BuilderTaskResponse = { task: BuilderTask };

export type CreateTaskInput = { draftText: string; industryCode: string };

/** `null` skips the question. */
export type AnswerInput = { questionId: number; answer: string | null };

export type CardInput = {
  industryCode: string;
  title: string;
  fields: Record<CardFieldKey, string | null>;
};
