import { Page, Stack } from "@/common/components/layout";
import { cn } from "@/common/lib/utils";
import { inlineLink, skeleton } from "@/common/styles";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type FormPageShellProps = {
  back: { to: string; label: string };
  children: ReactNode;
};

export const FormPageShell = ({ back, children }: FormPageShellProps) => (
  <Page>
    <Stack gap="lg" className="max-w-xl">
      <Link to={back.to} className={inlineLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {back.label}
      </Link>
      {children}
    </Stack>
  </Page>
);

export const FormPageSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="space-y-6"
    >
      <div className="space-y-2">
        <div className={cn(skeleton, "h-8 w-3/4")} />
        <div className={cn(skeleton, "h-4 w-1/3")} />
      </div>
      <div className={cn(skeleton, "h-96 w-full")} />
    </div>
  );
};
