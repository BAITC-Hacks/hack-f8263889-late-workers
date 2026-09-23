import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteNote } from "../api/notes";
import { notesKeys } from "../queryKeys";

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: notesKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
};
