import { Page, Stack } from "@/common/components/layout";
import { Button, Pagination } from "@/common/components/ui";
import { cardGrid, pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { ErrorState } from "../components/ErrorState";
import { SortSelect } from "../components/SortSelect";
import { TaskCard } from "../components/TaskCard";
import { TaskCardSkeletons } from "../components/TaskCardSkeletons";
import { useCatalogSearch } from "../hooks/useCatalogSearch";
import { useTasks } from "../hooks/useTasks";

const SKELETON_CARDS = 6;

export const CatalogPage = () => {
  const { t } = useTranslation();
  const search = useCatalogSearch();
  const tasks = useTasks(search.query);

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
          message={t("catalog.error")}
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
        <div className={cardGrid}>
          {items.map((task) => (
            <TaskCard key={task.id} task={task} catalogSearch={search.search} />
          ))}
        </div>
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
        <SortSelect value={search.sort} onChange={search.changeSort} />
        {renderResults()}
      </Stack>
    </Page>
  );
};
