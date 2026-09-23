import type { Milestone } from "@/modules/proposals";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { actionError, validateMilestoneTitle } from "../helpers";
import {
  useAddMilestone,
  useConfirmMilestone,
  useDeleteMilestone,
} from "./useSelectionMutations";
import { useReloadProposals } from "./useTaskProposals";

type Pending = { milestone: Milestone; action: "confirm" | "delete" };
type ShownError = { field?: string; form?: string };

/** Add form, plus the confirm/delete dialog of one selected proposal. */
export const useMilestones = (taskId: number, proposalId: number) => {
  const { t } = useTranslation();
  const reload = useReloadProposals(taskId);
  const add = useAddMilestone(taskId, proposalId);
  const confirm = useConfirmMilestone(taskId);
  const remove = useDeleteMilestone(taskId);
  const failed = t("selection.milestones.failed");

  const [title, setTitle] = useState("");
  const [addError, setAddError] = useState<ShownError>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [dialogError, setDialogError] = useState<string>();

  const changeTitle = (value: string) => {
    setTitle(value);
    setAddError({});
  };

  const submitAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validateMilestoneTitle(title);
    if (invalid) {
      setAddError({ field: t(invalid) });
      return;
    }
    add.mutate(title.trim(), {
      onSuccess: () => setTitle(""),
      onError: (failure) => {
        const shown = actionError(failure, "title", failed);
        setAddError(shown);
        if (shown.conflict) reload();
      },
    });
  };

  const ask = (milestone: Milestone, action: Pending["action"]) => {
    confirm.reset();
    remove.reset();
    setDialogError(undefined);
    setPending({ milestone, action });
  };

  const dialogPending = confirm.isPending || remove.isPending;

  const closeDialog = () => {
    if (!dialogPending) setPending(null);
  };

  const runDialog = () => {
    if (!pending) return;
    const mutation = pending.action === "confirm" ? confirm : remove;
    mutation.mutate(pending.milestone.id, {
      onSuccess: () => setPending(null),
      onError: (failure) => {
        const shown = actionError(failure, "", failed);
        setDialogError(shown.form ?? failed);
        if (shown.conflict) reload();
      },
    });
  };

  return {
    title,
    changeTitle,
    submitAdd,
    adding: add.isPending,
    addError,
    pending,
    ask,
    closeDialog,
    runDialog,
    dialogPending,
    dialogError,
  };
};
