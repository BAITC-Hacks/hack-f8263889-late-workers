import type { NotesQuery } from "./api/notes";

export const notesKeys = {
  all: ["notes"] as const,
  lists: () => [...notesKeys.all, "list"] as const,
  list: (query: NotesQuery) => [...notesKeys.lists(), query] as const,
  details: () => [...notesKeys.all, "detail"] as const,
  detail: (id: number) => [...notesKeys.details(), id] as const,
};
