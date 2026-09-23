import { Page, Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { inlineLink, pageTitle } from "@/common/styles";
import { ErrorState, isNotFound, parseTaskId } from "@/modules/catalog";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { BuilderContent } from "../components/BuilderContent";
import { BuilderSkeleton } from "../components/BuilderSteps";
import { useBuilderTask } from "../hooks/useBuilderTask";

export const BuilderPage = () => {
  const { t } = useTranslation();
  const id = parseTaskId(useParams().id);
  const task = useBuilderTask(id);
  const notFound = id === null || (task.isError && isNotFound(task.error));

  const renderTask = () => {
    if (task.isPending) return <BuilderSkeleton />;
    if (task.isError)
      return (
        <ErrorState
          message={t("builder.error")}
          onRetry={() => void task.refetch()}
        />
      );
    return <BuilderContent task={task.data} />;
  };

  return (
    <Page>
      {notFound ? (
        <Stack gap="lg">
          <h1 className={pageTitle}>{t("builder.notFound")}</h1>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/business">{t("builder.back")}</Link>
            </Button>
          </div>
        </Stack>
      ) : (
        <Stack gap="lg">
          <Link to="/business" className={inlineLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("builder.back")}
          </Link>
          {renderTask()}
        </Stack>
      )}
    </Page>
  );
};
