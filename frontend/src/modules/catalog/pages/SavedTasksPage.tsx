import { Page, Stack } from "@/common/components/layout";
import { Button, ErrorState } from "@/common/components/ui";
import { cardGrid, pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { TaskCard } from "../components/TaskCard";
import { TaskCardSkeletons } from "../components/TaskCardSkeletons";
import { useSavedTasks } from "../hooks/useSavedTasks";

const SKELETON_CARDS = 3;

export const SavedTasksPage = () => {
  const { t } = useTranslation();
  const saved = useSavedTasks();

  const renderTasks = () => {
    if (saved.isPending) return <TaskCardSkeletons count={SKELETON_CARDS} />;
    if (saved.isError)
      return (
        <ErrorState
          message={t("saved.error")}
          onRetry={() => void saved.refetch()}
        />
      );
    if (saved.data.length === 0)
      return (
        <Stack gap="md">
          <p className="text-muted-foreground text-sm">{t("saved.empty")}</p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/catalog">{t("saved.goCatalog")}</Link>
            </Button>
          </div>
        </Stack>
      );
    return (
      <div className={cardGrid}>
        {saved.data.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  };

  return (
    <Page>
      <Stack gap="xl">
        <h1 className={pageTitle}>{t("saved.title")}</h1>
        {renderTasks()}
      </Stack>
    </Page>
  );
};
