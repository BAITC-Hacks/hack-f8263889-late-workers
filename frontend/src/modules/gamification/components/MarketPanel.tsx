import { Section, Stack } from "@/common/components/layout";
import { Button, Card, ErrorState } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import { formatDateTime } from "@/core/api";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { hasMarket, marketMetrics } from "../helpers";
import { useTaskMarket } from "../hooks/useTaskMarket";
import type { TaskMarket } from "../types";

const MarketMetrics = ({ market }: { market: TaskMarket }) => {
  const { t, i18n } = useTranslation();
  return (
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {marketMetrics(market, i18n.language).map((metric) => (
        <Card key={metric.key} className="min-w-0 space-y-2 p-4">
          <dt className="text-muted-foreground text-sm">
            {t(`gamification.market.${metric.key}`)}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {metric.value ?? t("gamification.market.emptyValue")}
          </dd>
          {metric.medianKey && (
            <dd className="text-muted-foreground text-sm">
              {metric.median === null
                ? t("gamification.market.noIndustryData")
                : t(`gamification.market.${metric.medianKey}`, {
                    value: metric.median,
                  })}
            </dd>
          )}
        </Card>
      ))}
    </dl>
  );
};

const MarketSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      {[0, 1, 2, 3].map((index) => (
        <Card key={index} className="space-y-3 p-4">
          <div className={cn(skeleton, "h-4 w-24")} />
          <div className={cn(skeleton, "h-8 w-16")} />
          <div className={cn(skeleton, "h-4 w-full")} />
        </Card>
      ))}
    </div>
  );
};

type MarketPanelProps = {
  taskId: number;
  status: string;
  onHint: (block: string) => void;
};

export const MarketPanel = ({ taskId, status, onHint }: MarketPanelProps) => {
  const { t, i18n } = useTranslation();
  const query = useTaskMarket(taskId, status);
  if (!hasMarket(status)) return null;
  const market = query.data;

  return (
    <Section title={t("gamification.market.title")} divider={false}>
      <Stack gap="md">
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetching}
            aria-busy={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {t("gamification.market.refresh")}
          </Button>
        </div>
        {query.isPending && <MarketSkeleton />}
        {query.isError && (
          <ErrorState
            message={t("gamification.market.error")}
            onRetry={() => void query.refetch()}
          />
        )}
        {market && (
          <>
            <MarketMetrics market={market} />
            {market.sinceUpdate && (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {t("gamification.market.since", {
                  date: formatDateTime(
                    market.sinceUpdate.since,
                    i18n.language,
                    { dateStyle: "medium", timeStyle: "short" }
                  ),
                  views: t("gamification.market.viewsAdded", {
                    count: market.sinceUpdate.views,
                  }),
                  responses: t("gamification.market.responsesAdded", {
                    count: market.sinceUpdate.responses,
                  }),
                })}
              </p>
            )}
            {market.hint && (
              <div className="border-caution/40 bg-caution/10 space-y-3 rounded-lg border p-4">
                <p className="text-sm">
                  {t("gamification.market.hint", {
                    block: t(`builder.blocks.${market.hint.block}`, {
                      defaultValue: market.hint.name,
                    }),
                  })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onHint(market.hint!.block)}
                >
                  {t("gamification.market.improve")}
                </Button>
              </div>
            )}
          </>
        )}
      </Stack>
    </Section>
  );
};
