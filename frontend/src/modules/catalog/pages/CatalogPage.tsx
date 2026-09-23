import { Page } from "@/common/components/layout";
import { pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

export const CatalogPage = () => {
  const { t } = useTranslation();
  return (
    <Page>
      <h1 className={pageTitle}>{t("catalog.title")}</h1>
    </Page>
  );
};
