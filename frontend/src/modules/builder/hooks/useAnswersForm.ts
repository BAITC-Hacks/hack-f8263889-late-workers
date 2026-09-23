import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { buildCard, createRound, saveAnswers } from "../api/builder";
import {
  type AnswersFormValues,
  type AnswersPhase,
  answerErrors,
  conflictMessage,
  toAnswerDrafts,
  toAnswerInputs,
} from "../helpers";
import type { BuilderTask, Round } from "../types";
import { useTaskCache } from "./useTaskCache";

export type NextStep = "round" | "card";

/** Mount it per round: the form starts from that round's saved answers. */
export const useAnswersForm = (task: BuilderTask, round: Round) => {
  const { t } = useTranslation();
  const { apply, reload } = useTaskCache();
  const [phase, setPhase] = useState<AnswersPhase | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<AnswersFormValues>({
    defaultValues: { answers: toAnswerDrafts(round) },
  });

  const showError = (error: unknown) => {
    const conflict = conflictMessage(error);
    if (conflict !== null) {
      setMessage(conflict);
      reload(task.id);
      return;
    }
    const { byIndex, other } = answerErrors(error, round);
    for (const [index, text] of byIndex)
      form.setError(`answers.${index}.answer`, {
        type: "server",
        message: text,
      });
    if (byIndex.length === 0 || other.length > 0)
      setMessage(other.join(" ") || t("builder.questions.error"));
  };

  const submit = (next: NextStep) =>
    form.handleSubmit(async ({ answers }) => {
      setMessage(null);
      setPhase("saving");
      try {
        apply(
          await saveAnswers(task.id, round.number, toAnswerInputs(answers))
        );
        setPhase(next);
        apply(
          next === "round"
            ? await createRound(task.id)
            : await buildCard(task.id)
        );
      } catch (error) {
        showError(error);
      } finally {
        setPhase(null);
      }
    })();

  const toggleSkip = (index: number) => {
    const skipped = !form.getValues(`answers.${index}.skipped`);
    form.setValue(`answers.${index}.skipped`, skipped);
    if (skipped) form.setValue(`answers.${index}.answer`, "");
    form.clearErrors(`answers.${index}.answer`);
  };

  return { form, phase, message, submit, toggleSkip };
};
