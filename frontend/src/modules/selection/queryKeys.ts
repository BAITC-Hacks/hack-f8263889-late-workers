export const selectionKeys = {
  all: ["selection"] as const,
  task: (taskId: number) => [...selectionKeys.all, "task", taskId] as const,
};
