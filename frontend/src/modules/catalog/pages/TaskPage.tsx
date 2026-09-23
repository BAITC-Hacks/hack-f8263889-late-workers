import { Page, Stack } from "@/common/components/layout";
import { Button, ErrorState } from "@/common/components/ui";
import { inlineLink, pageTitle, prose } from "@/common/styles";
import { useAuthStore } from "@/modules/auth";
import { TaskProposalsBlock } from "@/modules/proposals";
import { ArrowLeft, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";

import { SaveTaskButton } from "../components/SaveTaskButton";
import { TaskBadges } from "../components/TaskBadges";
import { TaskFields } from "../components/TaskFields";
import { TaskPageSkeleton } from "../components/TaskPageSkeleton";
import {
  backToCatalogHref,
  builderPath,
  formatPublishedDate,
  isNotFound,
  parseTaskId,
} from "../helpers";
import { useTask } from "../hooks/useTask";

export const TaskPage = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const id = parseTaskId(useParams().id);
  const task = useTask(id);
  const backHref = backToCatalogHref(location.state);
  const isStudent = useAuthStore((state) => state.user?.role === "student");

  const notFound = id === null || (task.isError && isNotFound(task.error));

  const renderTask = () => {
    if (task.isPending) return <TaskPageSkeleton />;
    if (task.isError)
      return (
        <ErrorState
          message={t("task.error")}
          onRetry={() => void task.refetch()}
        />
      );

    const { data } = task;
    return (
      <Stack gap="xl">
        <Stack gap="md">
          <TaskBadges level={data.level.code} status={data.status} />
          <h1 className={pageTitle}>{data.title}</h1>
          <p className="text-muted-foreground">
            {data.companyName} · {data.industry.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <span className="text-muted-foreground">
                {t("catalog.card.rating")}{" "}
              </span>
              <span className="font-medium tabular-nums">
                {t("catalog.card.ratingValue", { rating: data.rating })}
              </span>
            </span>
            <span className="text-muted-foreground">
              {t("catalog.card.responses", { count: data.responsesCount })}
            </span>
            <span className="text-muted-foreground">
              {data.publishedAt
                ? t("task.published", {
                    date: formatPublishedDate(data.publishedAt, i18n.language),
                  })
                : data.status.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <SaveTaskButton taskId={data.id} isSaved={data.isSaved} />
            {data.isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to={builderPath(data.id)}>
                  <Pencil aria-hidden="true" />
                  {t("task.edit")}
                </Link>
              </Button>
            )}
          </div>
        </Stack>
        {isStudent && <TaskProposalsBlock taskId={data.id} />}
        <TaskFields fields={data.fields} />
      </Stack>
    );
  };

  return (
    <Page>
      <Stack gap="lg" className={prose}>
        {notFound ? (
          <>
            <h1 className={pageTitle}>{t("task.notFound")}</h1>
            <div>
              <Button asChild variant="outline" size="sm">
                <Link to={backHref}>{t("task.toCatalog")}</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Link to={backHref} className={inlineLink}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("task.back")}
            </Link>
            {renderTask()}
          </>
        )}
      </Stack>
    </Page>
  );
};
