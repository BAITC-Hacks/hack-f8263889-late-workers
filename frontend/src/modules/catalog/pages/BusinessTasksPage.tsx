import { Page } from "@/common/components/layout";
import { pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

export const BusinessTasksPage = () => {
  const { t } = useTranslation();
  return (
    <Page>
      <h1 className={pageTitle}>{t("myTasks.title")}</h1>
    </Page>
  );
};
