import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type UsersQuery, listUsers } from "../api/users";
import { usersKeys } from "../queryKeys";

/** Paginated users list — keeps the previous page on screen while the next one loads. */
export const useUsers = (query: UsersQuery = {}) =>
  useQuery({
    queryKey: usersKeys.list(query),
    queryFn: () => listUsers(query),
    placeholderData: keepPreviousData,
  });
