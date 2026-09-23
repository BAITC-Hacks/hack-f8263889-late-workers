import { useState } from "react";
import { useTranslation } from "react-i18next";

import { actionError, commentOrNull, validateComment } from "../helpers";
import type { Verdict } from "../types";
import { useDecision } from "./useSelectionMutations";
import { useReloadProposals } from "./useTaskProposals";

/** A snapshot, so the dialog survives the proposal leaving the list. */
export type DecisionTarget = {
  proposalId: number;
  teamName: string;
  verdict: Verdict;
};

type DecisionError = { field?: string; form?: string };

export const useDecisionFlow = (
  taskId: number,
  onDecided: (proposalId: number) => void
) => {
  const { t } = useTranslation();
  const decision = useDecision(taskId);
  const reload = useReloadProposals(taskId);
  const [target, setTarget] = useState<DecisionTarget | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<DecisionError>({});

  const open = (next: DecisionTarget) => {
    decision.reset();
    setComment("");
    setError({});
    setTarget(next);
  };

  const close = () => {
    if (!decision.isPending) setTarget(null);
  };

  const changeComment = (value: string) => {
    setComment(value);
    setError({});
  };

  const submit = () => {
    if (!target) return;
    const invalid = validateComment(comment);
    if (invalid) {
      setError({ field: t(invalid) });
      return;
    }
    decision.mutate(
      { ...target, comment: commentOrNull(comment) },
      {
        onSuccess: () => {
          setTarget(null);
          onDecided(target.proposalId);
        },
        onError: (failure) => {
          const shown = actionError(
            failure,
            "comment",
            t("selection.decision.failed")
          );
          setError(shown);
          if (shown.conflict) reload();
        },
      }
    );
  };

  return {
    target,
    comment,
    error,
    pending: decision.isPending,
    open,
    close,
    changeComment,
    submit,
  };
};

export type DecisionFlow = ReturnType<typeof useDecisionFlow>;
