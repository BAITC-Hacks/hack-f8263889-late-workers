import { Page } from "@/common/components/layout";
import { pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "../stores/useAuthStore";

export const CabinetPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  return (
    <Page className="flex min-h-[70vh] items-center justify-center">
      <h1 className={pageTitle}>
        {t(
          user?.role === "business"
            ? "auth.business.title"
            : "auth.student.title"
        )}
      </h1>
    </Page>
  );
};
