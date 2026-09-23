import { Footer, Page, Section, Stack } from "@/common/components/layout";
import { Button, Card } from "@/common/components/ui";
import {
  fieldError,
  inlineLink,
  pageDescription,
  pageTitle,
  prose,
} from "@/common/styles";
import { getErrorMessage } from "@/core/api";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NoteForm } from "../components/NoteForm";
import { NoteList } from "../components/NoteList";
import { Pagination } from "../components/Pagination";
import { useCreateNote } from "../hooks/useCreateNote";
import { useNotes } from "../hooks/useNotes";

const PAGE_SIZE = 10;

export const NotesPage = () => {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const notesQuery = useNotes({ limit: PAGE_SIZE, offset });
  const createNote = useCreateNote();

  const page = notesQuery.data;

  // After deleting the last note of a trailing page, step back so the view isn't empty.
  useEffect(() => {
    if (
      page &&
      !notesQuery.isPlaceholderData &&
      page.total > 0 &&
      page.items.length === 0 &&
      offset > 0
    ) {
      setOffset(Math.max(0, offset - PAGE_SIZE));
    }
  }, [page, notesQuery.isPlaceholderData, offset]);

  return (
    <Page>
      <Section divider={false}>
        <Stack gap="lg" className={prose}>
          <Link to="/" className={inlineLink}>
            <ArrowLeft className="h-3 w-3" />
            {t("goHome")}
          </Link>
          <h1 className={pageTitle}>{t("notes.title")}</h1>
          <p className={pageDescription}>{t("notes.description")}</p>
        </Stack>
      </Section>

      <Section title={t("notes.create.title")} delay={0.1}>
        <Card className="max-w-xl p-6 sm:p-8">
          <NoteForm
            submitLabel={t("notes.form.create")}
            onSubmit={(values) => createNote.mutateAsync(values)}
          />
        </Card>
      </Section>

      <Section title={t("notes.list.title")} delay={0.2}>
        {notesQuery.isPending ? (
          <p className="text-muted-foreground text-sm">
            {t("notes.list.loading")}
          </p>
        ) : notesQuery.isError ? (
          <Stack gap="md">
            <p className={fieldError}>{getErrorMessage(notesQuery.error)}</p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void notesQuery.refetch()}
              >
                {t("notes.list.retry")}
              </Button>
            </div>
          </Stack>
        ) : page && page.total > 0 ? (
          <>
            <NoteList notes={page.items} />
            <Pagination
              className="mt-8"
              total={page.total}
              limit={PAGE_SIZE}
              offset={offset}
              onOffsetChange={setOffset}
              disabled={notesQuery.isPlaceholderData}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("notes.list.empty")}
          </p>
        )}
      </Section>

      <Footer />
    </Page>
  );
};
