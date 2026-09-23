import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type NotesQuery, listNotes } from "../api/notes";
import { notesKeys } from "../queryKeys";

/** Paginated notes list — keeps the previous page on screen while the next one loads. */
export const useNotes = (query: NotesQuery = {}) =>
  useQuery({
    queryKey: notesKeys.list(query),
    queryFn: () => listNotes(query),
    placeholderData: keepPreviousData,
  });
