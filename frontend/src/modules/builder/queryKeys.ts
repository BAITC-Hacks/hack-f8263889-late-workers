export const builderKeys = {
  all: ["builder"] as const,
  details: () => [...builderKeys.all, "detail"] as const,
  detail: (id: number) => [...builderKeys.details(), id] as const,
};
