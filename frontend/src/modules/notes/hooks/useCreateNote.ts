import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNote } from "../api/notes";
import { notesKeys } from "../queryKeys";

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
};
