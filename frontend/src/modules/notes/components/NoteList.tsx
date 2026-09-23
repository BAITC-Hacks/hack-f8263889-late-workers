import { Card } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { fieldError, iconButton } from "@/common/styles";
import { formatDateTime, getErrorMessage } from "@/core/api";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Note } from "../api/notes";
import { useDeleteNote } from "../hooks/useDeleteNote";
import { useUpdateNote } from "../hooks/useUpdateNote";
import { NoteForm } from "./NoteForm";

const cardAction = cn(
  iconButton,
  "h-8 w-8 disabled:pointer-events-none disabled:opacity-40"
);

/** Notes with inline edit + delete. Actions freeze while a mutation is in flight. */
export const NoteList = ({ notes }: { notes: Note[] }) => {
  const { t, i18n } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const mutating = updateNote.isPending || deleteNote.isPending;

  return (
    <div>
      {/* items-start keeps each card at its natural height instead of
          stretching a whole row to match the longest note. */}
      <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {notes.map((note) =>
          editingId === note.id ? (
            // The editor spans the row so the form keeps a usable width.
            <li
              key={note.id}
              className="sm:col-span-2 lg:col-span-3 xl:col-span-4"
            >
              <Card className="max-w-xl p-4 sm:p-6">
                <NoteForm
                  defaultValues={{ title: note.title, content: note.content }}
                  submitLabel={t("notes.form.save")}
                  onSubmit={async (values) => {
                    await updateNote.mutateAsync({
                      id: note.id,
                      patch: values,
                    });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </Card>
            </li>
          ) : (
            <li key={note.id}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium break-words">
                    {note.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(note.id)}
                      disabled={mutating}
                      className={cardAction}
                      aria-label={t("notes.list.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote.mutate(note.id)}
                      disabled={mutating}
                      className={cn(
                        cardAction,
                        "hover:border-destructive hover:text-destructive"
                      )}
                      aria-label={t("notes.list.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {note.content && (
                  <p className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
                <p className="text-muted-foreground/70 text-xs">
                  {t("notes.list.updatedAt", {
                    date: formatDateTime(note.updated_at, i18n.language),
                  })}
                </p>
              </Card>
            </li>
          )
        )}
      </ul>
      {deleteNote.isError && (
        <p className={fieldError + " mt-4"}>
          {getErrorMessage(deleteNote.error)}
        </p>
      )}
    </div>
  );
};
