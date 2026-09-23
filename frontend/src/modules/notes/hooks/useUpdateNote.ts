import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type NoteUpdate, updateNote } from "../api/notes";
import { notesKeys } from "../queryKeys";

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: NoteUpdate }) =>
      updateNote(id, patch),
    onSuccess: (note) => {
      // The server response is authoritative — seed the detail cache with it.
      queryClient.setQueryData(notesKeys.detail(note.id), note);
      void queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
};
