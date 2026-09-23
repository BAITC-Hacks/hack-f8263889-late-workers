export const proposalsKeys = {
  all: ["proposals"] as const,
  mine: () => [...proposalsKeys.all, "mine"] as const,
  byTask: (taskId: number) => [...proposalsKeys.all, "byTask", taskId] as const,
  detail: (id: number) => [...proposalsKeys.all, "detail", id] as const,
  taskHeader: (taskId: number) =>
    [...proposalsKeys.all, "taskHeader", taskId] as const,
};
