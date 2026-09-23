import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { confirmCard, publishTask, unpublishTask } from "../api/builder";
import {
  type CardFormValues,
  cardFieldId,
  conflictMessage,
  hintTarget,
  isCardFormField,
  publishBlocker,
  toCardInput,
  toCardValues,
  validationFields,
} from "../helpers";
import type { BlockCode, BuilderTask } from "../types";
import { useLeaveGuard } from "./useLeaveGuard";
import { useTaskCache } from "./useTaskCache";

export type CardAction = "confirm" | "publish" | "unpublish" | "republish";

const FAILURE_KEYS: Record<CardAction, string> = {
  confirm: "builder.card.confirmError",
  publish: "builder.publish.error",
  unpublish: "builder.publish.actionError",
  republish: "builder.publish.actionError",
};

/** Mount it per task: the form starts from `defaults` and is reset only by a confirmation. */
export const useCardEditor = (task: BuilderTask, defaults: CardFormValues) => {
  const { t } = useTranslation();
  const { apply } = useTaskCache();
  const [pending, setPending] = useState<CardAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const form = useForm<CardFormValues>({ defaultValues: defaults });
  const { isDirty } = form.formState;

  useLeaveGuard(isDirty, t("builder.card.leave"));

  const showError = (action: CardAction, error: unknown) => {
    const fields = Object.entries(validationFields(error));
    let placed = 0;
    for (const [name, text] of fields) {
      if (!isCardFormField(name)) continue;
      form.setError(name as FieldPath<CardFormValues>, {
        type: "server",
        message: text,
      });
      placed += 1;
    }
    // The spec gives a failed confirmation its own text, even for a 409.
    const conflict = action === "confirm" ? null : conflictMessage(error);
    if (conflict !== null) setMessage(conflict);
    else if (placed === 0 || placed < fields.length)
      setMessage(t(FAILURE_KEYS[action]));
  };

  const run = async (
    action: CardAction,
    request: () => Promise<BuilderTask>,
    onDone?: (next: BuilderTask) => void
  ) => {
    setMessage(null);
    setPending(action);
    try {
      const next = await request();
      apply(next);
      onDone?.(next);
    } catch (error) {
      showError(action, error);
    } finally {
      setPending(null);
    }
  };

  const confirm = form.handleSubmit((values) =>
    run(
      "confirm",
      () => confirmCard(task.id, toCardInput(values)),
      (next) => form.reset(toCardValues(next))
    )
  );

  const publish = () =>
    run(task.status.code === "unpublished" ? "republish" : "publish", () =>
      publishTask(task.id)
    );

  const unpublish = async () => {
    await run("unpublish", () => unpublishTask(task.id));
    setUnpublishOpen(false);
  };

  const focusHint = (block: BlockCode) => {
    const target = hintTarget(block, form.getValues("fields"));
    const element = document.getElementById(cardFieldId(target));
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  };

  return {
    form,
    isDirty,
    pending,
    message,
    publishing: pending === "publish" || pending === "republish",
    blocker: publishBlocker(task, isDirty),
    confirm,
    publish,
    unpublish,
    unpublishOpen,
    setUnpublishOpen,
    focusHint,
  };
};

export type CardEditorState = ReturnType<typeof useCardEditor>;
