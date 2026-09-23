import { Page, Stack } from "@/common/components/layout";
import { Card } from "@/common/components/ui";
import { pageDescription, pageTitle } from "@/common/styles";
import type { ReactNode } from "react";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const AuthFormShell = ({
  title,
  description,
  children,
}: AuthFormShellProps) => (
  <Page>
    <Stack gap="lg" className="max-w-xl">
      <Stack gap="sm">
        <h1 className={pageTitle}>{title}</h1>
        <p className={pageDescription}>{description}</p>
      </Stack>
      <Card className="max-w-xl p-6 sm:p-8">{children}</Card>
    </Stack>
  </Page>
);
