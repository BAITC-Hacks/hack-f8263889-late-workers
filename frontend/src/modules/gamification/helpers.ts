import type { BadgeDefinition, EarnedBadge, TaskMarket } from "./types";

export const badgeNameKey = (code: string) =>
  `gamification.badges.${code}.name`;
export const badgeConditionKey = (code: string) =>
  `gamification.badges.${code}.condition`;

export const displayedBadges = (badges: EarnedBadge[], limit?: number) => ({
  visible: limit === undefined ? badges : badges.slice(0, Math.max(0, limit)),
  remaining:
    limit === undefined ? 0 : Math.max(0, badges.length - Math.max(0, limit)),
});

export const badgeDefinition = (
  definitions: BadgeDefinition[] | undefined,
  code: string
) => definitions?.find((badge) => badge.code === code);

export const hasMarket = (status: string) =>
  status === "published" ||
  status === "in_progress" ||
  status === "unpublished";

const metricNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

export const marketMetrics = (market: TaskMarket, locale: string) => [
  { key: "views", value: metricNumber(market.views, locale) },
  { key: "saves", value: metricNumber(market.saves, locale) },
  {
    key: "responses",
    value: metricNumber(market.responses, locale),
    medianKey: "medianResponses",
    median:
      market.industryMedianResponses === null
        ? null
        : metricNumber(market.industryMedianResponses, locale),
  },
  {
    key: "conversion",
    value:
      market.conversion === null
        ? null
        : `${metricNumber(market.conversion, locale)}%`,
    medianKey: "medianConversion",
    median:
      market.industryMedianConversion === null
        ? null
        : metricNumber(market.industryMedianConversion, locale),
  },
];
