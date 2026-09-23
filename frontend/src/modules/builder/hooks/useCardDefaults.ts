import { useTask } from "@/modules/catalog";

import { type CardFormValues, toCardValues } from "../helpers";
import type { BuilderTask } from "../types";

/** `null` while a card-less task's values still load from its catalog page. */
export const useCardDefaults = (task: BuilderTask): CardFormValues | null => {
  const detail = useTask(task.card ? null : task.id);
  if (task.card) return toCardValues(task);
  if (detail.isPending) return null;
  return toCardValues(task, detail.data);
};
