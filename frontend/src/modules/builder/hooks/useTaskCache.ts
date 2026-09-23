import { catalogKeys } from "@/modules/catalog";
import { useQueryClient } from "@tanstack/react-query";

import { builderKeys } from "../queryKeys";
import type { BuilderTask } from "../types";

/**
 * Every builder response is the whole task: it replaces the page state as is,
 * and the catalog views that show the task go stale.
 */
export const useTaskCache = () => {
  const queryClient = useQueryClient();

  const apply = (task: BuilderTask) => {
    queryClient.setQueryData(builderKeys.detail(task.id), task);
    void queryClient.invalidateQueries({ queryKey: catalogKeys.business() });
    void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() });
    void queryClient.invalidateQueries({
      queryKey: catalogKeys.detail(task.id),
    });
  };

  const reload = (id: number) =>
    void queryClient.invalidateQueries({ queryKey: builderKeys.detail(id) });

  return { apply, reload };
};
