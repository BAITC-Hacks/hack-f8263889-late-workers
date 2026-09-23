import { builderPath } from "@/modules/catalog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { createRound, createTask } from "../api/builder";
import {
  isDraftLengthValid,
  isNewTaskField,
  validationFields,
} from "../helpers";
import type { BuilderTask, CreateTaskInput } from "../types";
import { useTaskCache } from "./useTaskCache";

export type NewTaskPhase = "saving" | "analyzing";

export const useNewTaskForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apply } = useTaskCache();
  const [phase, setPhase] = useState<NewTaskPhase | null>(null);
  const form = useForm<CreateTaskInput>({
    defaultValues: { draftText: "", industryCode: "" },
  });

  const draftText = form.register("draftText", {
    validate: (value) =>
      isDraftLengthValid(value) || t("builder.new.errors.draftLength"),
  });
  const industryCode = form.register("industryCode", {
    validate: (value) =>
      value !== "" || t("builder.new.errors.industryRequired"),
  });

  const showError = (error: unknown) => {
    const fields = Object.entries(validationFields(error));
    let placed = 0;
    for (const [name, message] of fields) {
      if (!isNewTaskField(name)) continue;
      form.setError(name, { type: "server", message });
      placed += 1;
    }
    if (placed === 0 || placed < fields.length)
      form.setError("root", {
        type: "server",
        message: t("builder.new.error"),
      });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setPhase("saving");
    let task: BuilderTask;
    try {
      task = await createTask({
        draftText: values.draftText.trim(),
        industryCode: values.industryCode,
      });
    } catch (error) {
      setPhase(null);
      showError(error);
      return;
    }
    apply(task);

    setPhase("analyzing");
    try {
      apply(await createRound(task.id));
    } catch {
      // The draft is saved: the builder opens it with its own "analyze" button.
    }
    navigate(builderPath(task.id));
  });

  return { form, draftText, industryCode, onSubmit, phase };
};
