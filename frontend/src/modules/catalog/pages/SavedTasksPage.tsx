import { Page } from "@/common/components/layout";
import { pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

export const SavedTasksPage = () => {
  const { t } = useTranslation();
  return (
    <Page>
      <h1 className={pageTitle}>{t("saved.title")}</h1>
    </Page>
  );
};
