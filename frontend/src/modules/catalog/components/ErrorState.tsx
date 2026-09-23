import { Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  children?: ReactNode;
};

export const ErrorState = ({ message, onRetry, children }: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      <p role="alert" className="text-destructive text-sm">
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
        {children}
      </div>
    </Stack>
  );
};
