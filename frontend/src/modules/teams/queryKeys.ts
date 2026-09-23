export const teamsKeys = {
  all: ["teams"] as const,
  my: () => [...teamsKeys.all, "my"] as const,
  details: () => [...teamsKeys.all, "detail"] as const,
  detail: (id: number) => [...teamsKeys.details(), id] as const,
};
