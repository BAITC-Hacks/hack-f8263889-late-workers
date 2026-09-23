import { Footer, Page, Section, Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { pageDescription, pageTitle, prose } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { UsersPagination } from "../components/UsersPagination";
import { UsersTable } from "../components/UsersTable";
import { UsersTableSkeleton } from "../components/UsersTableSkeleton";
import { UsersToolbar } from "../components/UsersToolbar";
import { useUsers } from "../hooks/useUsers";
import { useUsersQueryState } from "../hooks/useUsersQueryState";

export const UsersPage = () => {
  const { t } = useTranslation();
  const state = useUsersQueryState();
  const usersQuery = useUsers(state.params);

  const page = usersQuery.data;

  return (
    <Page>
      <Section divider={false}>
        <Stack gap="lg" className={prose}>
          <h1 className={pageTitle}>{t("users.title")}</h1>
          <p className={pageDescription}>{t("users.description")}</p>
        </Stack>
      </Section>

      <Section title={t("users.list.title")} delay={0.1}>
        <Stack gap="xl">
          <UsersToolbar
            q={state.q}
            status={state.status}
            onQChange={state.changeQ}
            onStatusChange={state.changeStatus}
          />

          {usersQuery.isPending ? (
            <UsersTableSkeleton />
          ) : usersQuery.isError ? (
            <Stack gap="md">
              <p className="text-destructive text-sm">
                {t("users.list.error")}
              </p>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void usersQuery.refetch()}
                >
                  {t("users.list.retry")}
                </Button>
              </div>
            </Stack>
          ) : page && page.total > 0 ? (
            <Stack gap="lg">
              <UsersTable
                users={page.items}
                sort={state.sort}
                order={state.order}
                onSort={state.toggleSort}
              />
              <UsersPagination
                total={page.total}
                limit={page.limit}
                page={state.page}
                onPageChange={state.changePage}
                disabled={usersQuery.isPlaceholderData}
              />
            </Stack>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("users.list.empty")}
            </p>
          )}
        </Stack>
      </Section>

      <Footer />
    </Page>
  );
};
