import { Button } from "@/common/components/ui";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useAuthBootstrap } from "../hooks/useAuthBootstrap";

export const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  const { status, retry } = useAuthBootstrap();
  const { t } = useTranslation();

  if (status === "loading")
    return (
      <main
        className="flex min-h-screen items-center justify-center gap-3 px-6"
        role="status"
      >
        <LoaderCircle
          className="text-primary h-5 w-5 animate-spin"
          aria-hidden="true"
        />
        <span>{t("auth.session.loading")}</span>
      </main>
    );

  if (status === "error")
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p role="alert">{t("auth.session.error")}</p>
        <Button onClick={retry}>{t("auth.session.retry")}</Button>
      </main>
    );

  return children;
};
