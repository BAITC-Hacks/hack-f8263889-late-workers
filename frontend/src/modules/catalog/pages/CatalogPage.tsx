import { Page, Stack } from "@/common/components/layout";
import { Button, Card, ErrorState, Pagination } from "@/common/components/ui";
import { cardGrid, pageTitle } from "@/common/styles";
import { useBadges } from "@/modules/gamification";
import { useTranslation } from "react-i18next";

import { CatalogFilters } from "../components/CatalogFilters";
import { SortSelect } from "../components/SortSelect";
import { TaskCard } from "../components/TaskCard";
import { TaskCardSkeletons } from "../components/TaskCardSkeletons";
import { catalogBadgeError } from "../helpers";
import { useCatalogSearch } from "../hooks/useCatalogSearch";
import { useIndustries } from "../hooks/useIndustries";
import { useTasks } from "../hooks/useTasks";

const SKELETON_CARDS = 6;

export const CatalogPage = () => {
  const { t } = useTranslation();
  const search = useCatalogSearch();
  const tasks = useTasks(search.query);
  const industries = useIndustries();
  const badges = useBadges();

  const resetFilters = search.hasFilters && (
    <Button variant="outline" size="sm" onClick={search.resetFilters}>
      {t("catalog.filters.reset")}
    </Button>
  );

  const renderResults = () => {
    if (tasks.isPending) return <TaskCardSkeletons count={SKELETON_CARDS} />;
    if (tasks.isError)
      return (
        <ErrorState
          message={catalogBadgeError(tasks.error) ?? t("catalog.error")}
          onRetry={() => void tasks.refetch()}
        >
          {resetFilters}
        </ErrorState>
      );
    const { items, total, pageSize, page } = tasks.data;
    if (total === 0)
      return (
        <Stack gap="md">
          <p className="text-muted-foreground text-sm">
            {t(search.hasFilters ? "catalog.emptyFiltered" : "catalog.empty")}
          </p>
          {resetFilters && <div>{resetFilters}</div>}
        </Stack>
      );
    return (
      <Stack gap="lg">
        {items.length > 0 ? (
          <div className={cardGrid}>
            {items.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                catalogSearch={search.search}
              />
            ))}
          </div>
        ) : (
          // A shared link can outlive its page once the catalogue shrinks.
          <Stack gap="md">
            <p className="text-muted-foreground text-sm">
              {t("catalog.pageEmpty")}
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => search.changePage(1)}
              >
                {t("catalog.firstPage")}
              </Button>
            </div>
          </Stack>
        )}
        <Pagination
          total={total}
          pageSize={pageSize}
          page={page}
          onPageChange={search.changePage}
          label={t("catalog.pagination")}
        />
      </Stack>
    );
  };

  return (
    <Page>
      <Stack gap="xl">
        <h1 className={pageTitle}>{t("catalog.title")}</h1>
        <Stack gap="md">
          <Card className="space-y-6 p-5">
            <CatalogFilters
              industries={industries.data}
              industriesLoading={industries.isPending}
              selectedIndustries={search.industries}
              selectedLevels={search.levels}
              badges={badges.data}
              badgesLoading={badges.isPending}
              badgesError={badges.isError}
              selectedBadges={search.badges}
              onToggleIndustry={search.toggleIndustry}
              onToggleLevel={search.toggleLevel}
              onToggleBadge={search.toggleBadge}
              onRetryBadges={() => void badges.refetch()}
            />
            <div className="flex flex-wrap items-end gap-4">
              <SortSelect value={search.sort} onChange={search.changeSort} />
              {resetFilters}
            </div>
          </Card>
          {industries.isError && (
            <ErrorState
              message={t("catalog.filters.industriesError")}
              onRetry={() => void industries.refetch()}
            />
          )}
        </Stack>
        {renderResults()}
      </Stack>
    </Page>
  );
};
