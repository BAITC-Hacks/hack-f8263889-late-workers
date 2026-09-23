export type EarnedBadge = { code: string; name: string };

export type BadgeDefinition = EarnedBadge & { condition: string };

export type TaskMarket = {
  views: number;
  saves: number;
  responses: number;
  conversion: number | null;
  industryMedianResponses: number | null;
  industryMedianConversion: number | null;
  sinceUpdate: { since: string; views: number; responses: number } | null;
  hint: { block: string; name: string } | null;
};
