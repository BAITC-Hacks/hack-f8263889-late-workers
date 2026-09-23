import { useQuery } from "@tanstack/react-query";

import { getNote } from "../api/notes";
import { notesKeys } from "../queryKeys";

export const useNote = (id: number) =>
  useQuery({
    queryKey: notesKeys.detail(id),
    queryFn: () => getNote(id),
  });
