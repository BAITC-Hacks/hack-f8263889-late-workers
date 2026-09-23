import type { BadgeProps } from "@/common/components/ui";
import { isApiError } from "@/core/api";
import {
  type Industry,
  TASK_FIELDS,
  type TaskDetail,
  isBlank,
} from "@/modules/catalog";

import type {
  AnswerInput,
  BlockCode,
  BuilderTask,
  CardFieldKey,
  CardInput,
  FieldSource,
  QualityCode,
  RatingEntry,
  Round,
} from "./types";

export const DRAFT_MIN = 50;
export const DRAFT_MAX = 3000;
export const ANSWER_MAX = 1000;
export const TITLE_MAX = 120;
export const FIELD_MAX = 2000;

export const BUILDER_STEPS = [
  "description",
  "clarification",
  "card",
  "publication",
] as const;
export type BuilderStep = (typeof BUILDER_STEPS)[number];

export const stepForStatus = (status: string): BuilderStep => {
  if (status === "draft" || status === "clarifying") return "clarification";
  if (status === "review") return "card";
  return "publication";
};

export type BuilderView = "analyze" | "clarify" | "card";

export const viewForTask = (task: BuilderTask): BuilderView => {
  if (task.status.code === "draft") return "analyze";
  if (task.status.code === "clarifying")
    return task.rounds.length > 0 ? "clarify" : "analyze";
  return "card";
};

export const lastRound = (task: BuilderTask): Round | null =>
  task.rounds.at(-1) ?? null;

export const earlierRounds = (task: BuilderTask) => task.rounds.slice(0, -1);

export const usedFallback = (task: BuilderTask) =>
  lastRound(task)?.mode === "fallback" || task.card?.mode === "fallback";

const QUALITY_BADGE: Record<QualityCode, BadgeProps["variant"]> = {
  missing: "destructive",
  formal: "warning",
  partial: "caution",
  specific: "success",
};

export const qualityBadgeVariant = (
  quality: QualityCode
): BadgeProps["variant"] => QUALITY_BADGE[quality] ?? "muted";

export const blockNameKey = (block: string) => `builder.blocks.${block}`;

export const qualityNameKey = (quality: string) => `builder.quality.${quality}`;

export const isListed = (status: string) =>
  status === "published" || status === "in_progress";

// --- Errors -------------------------------------------------------------------

export const validationFields = (error: unknown): Record<string, string> =>
  isApiError(error) && error.status === 422 ? (error.fields ?? {}) : {};

export const conflictMessage = (error: unknown) =>
  isApiError(error) && error.status === 409 ? error.message : null;

// --- New task -----------------------------------------------------------------

export const isDraftLengthValid = (text: string) => {
  const { length } = text.trim();
  return length >= DRAFT_MIN && length <= DRAFT_MAX;
};

export const NEW_TASK_FIELDS = ["draftText", "industryCode"] as const;

export const isNewTaskField = (
  name: string
): name is (typeof NEW_TASK_FIELDS)[number] =>
  (NEW_TASK_FIELDS as readonly string[]).includes(name);

// --- Answers ------------------------------------------------------------------

export type AnswerDraft = {
  questionId: number;
  answer: string;
  skipped: boolean;
};
export type AnswersFormValues = { answers: AnswerDraft[] };

export type AnswersPhase = "saving" | "round" | "card";

const ANSWERS_PHASE_KEYS: Record<AnswersPhase, string> = {
  saving: "builder.questions.saving",
  round: "builder.questions.preparing",
  card: "builder.questions.building",
};

export const answersPhaseKey = (phase: AnswersPhase) =>
  ANSWERS_PHASE_KEYS[phase];

export const toAnswerDrafts = (round: Round): AnswerDraft[] =>
  round.questions.map((question) => ({
    questionId: question.id,
    answer: question.answer ?? "",
    skipped: question.skipped,
  }));

/** An empty answer counts as skipped, and a skipped one is sent whatever its field holds. */
export const toAnswerInputs = (drafts: AnswerDraft[]): AnswerInput[] =>
  drafts.map(({ questionId, answer, skipped }) => ({
    questionId,
    answer: skipped ? null : (answer ?? "").trim() || null,
  }));

/** A 422 keyed `answers.<questionId>`, as form indexes; other keys come back as plain text. */
export const answerErrors = (error: unknown, round: Round) => {
  const indexes = new Map(
    round.questions.map((question, index) => [`answers.${question.id}`, index])
  );
  const byIndex: [number, string][] = [];
  const other: string[] = [];
  for (const [key, message] of Object.entries(validationFields(error))) {
    const index = indexes.get(key);
    if (index === undefined) other.push(message);
    else byIndex.push([index, message]);
  }
  return { byIndex, other };
};

// --- Card ---------------------------------------------------------------------

export type CardFormValues = {
  title: string;
  industryCode: string;
  fields: Record<CardFieldKey, string>;
};

const mapFields = <T>(value: (key: CardFieldKey) => T) =>
  Object.fromEntries(TASK_FIELDS.map((key) => [key, value(key)])) as Record<
    CardFieldKey,
    T
  >;

/**
 * The editor's starting values. A task published before the builder existed
 * has no card, so its catalog page stands in for it.
 */
export const toCardValues = (
  task: BuilderTask,
  fallback?: TaskDetail | null
): CardFormValues => {
  const { card } = task;
  return {
    title: (card ? card.title.value : fallback?.title) ?? "",
    industryCode: task.industry.code,
    fields: mapFields(
      (key) => (card ? card.fields[key].value : fallback?.fields[key]) ?? ""
    ),
  };
};

export const toCardInput = (values: CardFormValues): CardInput => ({
  industryCode: values.industryCode,
  title: values.title.trim(),
  fields: mapFields((key) => values.fields[key].trim() || null),
});

const CARD_FORM_FIELDS = new Set([
  "title",
  "industryCode",
  ...TASK_FIELDS.map((key) => `fields.${key}`),
]);

/** Server error keys (`title`, `industryCode`, `fields.<key>`) match the form's own paths. */
export const isCardFormField = (name: string) => CARD_FORM_FIELDS.has(name);

export const cardFieldId = (key: CardFieldKey | "title" | "industryCode") =>
  `card-${key}`;

export type FieldMark = FieldSource | "changed";

/** An edit that is not confirmed yet replaces the source label. */
export const fieldMark = (
  source: FieldSource | null,
  changed: boolean
): FieldMark | null => (changed ? "changed" : source);

const FIELD_MARK_BADGE: Record<FieldMark, BadgeProps["variant"]> = {
  ai: "primary",
  human: "muted",
  profile: "muted",
  changed: "warning",
};

export const fieldMarkVariant = (mark: FieldMark) => FIELD_MARK_BADGE[mark];

export type SourceNote = { kind: "draft" | "answer"; text: string };

/** A draft fragment quotes the draft; an answer names the question it answered. */
export const describeSources = (
  task: BuilderTask,
  ids: string[]
): SourceNote[] => {
  const fragments = new Map(
    task.fragments.map((fragment) => [fragment.id, fragment])
  );
  const questions = new Map(
    task.rounds
      .flatMap((round) => round.questions)
      .map((question) => [question.id, question.text])
  );
  return ids.flatMap((id): SourceNote[] => {
    const fragment = fragments.get(id);
    if (!fragment) return [];
    if (fragment.questionId === null)
      return [{ kind: "draft", text: fragment.text }];
    const question = questions.get(fragment.questionId);
    return question ? [{ kind: "answer", text: question }] : [];
  });
};

export const sourceNoteKey = (note: SourceNote) =>
  note.kind === "draft"
    ? "builder.card.sourceDraft"
    : "builder.card.sourceAnswer";

/** The task's own industry stays selectable while the list loads or if it fails. */
export const industryOptions = (
  industries: Industry[] | undefined,
  current: Industry
): Industry[] =>
  industries?.some((industry) => industry.code === current.code)
    ? industries
    : [current, ...(industries ?? [])];

// --- Rating -------------------------------------------------------------------

export const ratingShare = (entry: RatingEntry) =>
  entry.maxPoints > 0
    ? Math.min(100, Math.max(0, (entry.points / entry.maxPoints) * 100))
    : 0;

export type RatingHint = { block: BlockCode; textKey: string; gain: number };

/** Blocks short of their maximum, the largest gain first; ties keep the breakdown order. */
export const ratingHints = (breakdown: RatingEntry[]): RatingHint[] =>
  breakdown
    .filter((entry) => entry.points < entry.maxPoints)
    .map((entry) => ({
      block: entry.block,
      textKey: `builder.hints.${entry.block}.${
        entry.quality.code === "missing" ? "missing" : "improve"
      }`,
      gain: entry.maxPoints - entry.points,
    }))
    .sort((a, b) => b.gain - a.gain);

export const formatGain = (gain: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(gain);

const HINT_TARGETS: Record<
  BlockCode,
  { firstEmpty: CardFieldKey[]; otherwise: CardFieldKey }
> = {
  context_need: { firstEmpty: ["context", "need"], otherwise: "context" },
  data: { firstEmpty: [], otherwise: "dataMaterials" },
  result: { firstEmpty: [], otherwise: "expectedResult" },
  success_criteria: { firstEmpty: [], otherwise: "successCriteria" },
  constraints: { firstEmpty: [], otherwise: "constraints" },
  users: { firstEmpty: [], otherwise: "targetUsers" },
  business_link: {
    firstEmpty: ["contact", "interactionFormat"],
    otherwise: "interactionFormat",
  },
};

export const hintTarget = (
  block: BlockCode,
  fields: Record<CardFieldKey, string>
): CardFieldKey => {
  const target = HINT_TARGETS[block];
  return (
    target.firstEmpty.find((key) => !fields[key].trim()) ?? target.otherwise
  );
};

// --- Publication ----------------------------------------------------------------

export type PublishBlocker = "confirm" | "required";

/** Publishing takes the confirmed card as the server holds it, never unconfirmed edits. */
export const publishBlocker = (
  task: BuilderTask,
  hasEdits: boolean
): PublishBlocker | null => {
  if (task.confirmedAt === null || hasEdits) return "confirm";
  const title = task.card?.title.value ?? null;
  const need = task.card?.fields.need.value ?? null;
  if (isBlank(title) || isBlank(need)) return "required";
  return null;
};

// --- Leaving the page -----------------------------------------------------------

/** A plain click on a same-origin link: the router would leave the page without unloading it. */
export const isInAppLeave = (event: MouseEvent) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return false;
  const link =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  return (
    link instanceof HTMLAnchorElement &&
    (!link.target || link.target === "_self") &&
    !link.hasAttribute("download") &&
    link.origin === window.location.origin
  );
};
