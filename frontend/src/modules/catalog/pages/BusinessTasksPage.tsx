import { Page, Stack } from "@/common/components/layout";
import { Button, ErrorState } from "@/common/components/ui";
import { pageTitle } from "@/common/styles";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  BusinessTasksTable,
  BusinessTasksTableSkeleton,
} from "../components/BusinessTasksTable";
import { useBusinessTasks } from "../hooks/useBusinessTasks";

const SKELETON_ROWS = 3;

export const BusinessTasksPage = () => {
  const { t } = useTranslation();
  const tasks = useBusinessTasks();

  const renderTasks = () => {
    if (tasks.isPending)
      return <BusinessTasksTableSkeleton rows={SKELETON_ROWS} />;
    if (tasks.isError)
      return (
        <ErrorState
          message={t("myTasks.error")}
          onRetry={() => void tasks.refetch()}
        />
      );
    if (tasks.data.length === 0)
      return (
        <p className="text-muted-foreground text-sm">{t("myTasks.empty")}</p>
      );
    return <BusinessTasksTable tasks={tasks.data} />;
  };

  return (
    <Page>
      <Stack gap="xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className={pageTitle}>{t("myTasks.title")}</h1>
          <Button asChild>
            <Link to="/business/tasks/new">
              <Plus aria-hidden="true" />
              {t("myTasks.create")}
            </Link>
          </Button>
        </div>
        {renderTasks()}
      </Stack>
    </Page>
  );
};
