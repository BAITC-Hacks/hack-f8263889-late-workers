export const gamificationKeys = {
  all: ["gamification"] as const,
  badges: () => [...gamificationKeys.all, "badges"] as const,
  market: (id: number) => [...gamificationKeys.all, "market", id] as const,
};
