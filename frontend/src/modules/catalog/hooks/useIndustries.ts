import { useQuery } from "@tanstack/react-query";

import { listIndustries } from "../api/industries";
import { retryUnlessClientError } from "../helpers";
import { catalogKeys } from "../queryKeys";

export const useIndustries = () =>
  useQuery({
    queryKey: catalogKeys.industries(),
    queryFn: ({ signal }) => listIndustries(signal),
    staleTime: Infinity,
    retry: retryUnlessClientError,
  });
