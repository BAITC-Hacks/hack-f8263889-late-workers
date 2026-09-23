import { useLocation, useNavigate } from "react-router-dom";

import {
  type CatalogSearch,
  buildCatalogSearch,
  hasActiveFilters,
  parseCatalogSearch,
  toTasksQuery,
  toggleValue,
} from "../helpers";
import type { TaskLevelCode, TaskSort } from "../types";

/** Sort, filters and page live in the address; any change but paging rewinds to page 1. */
export const useCatalogSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = parseCatalogSearch(location.search);

  const update = (next: CatalogSearch) =>
    navigate({ search: buildCatalogSearch(next) });

  return {
    ...state,
    search: location.search,
    query: toTasksQuery(state),
    hasFilters: hasActiveFilters(state),
    changeSort: (sort: TaskSort) => update({ ...state, sort, page: 1 }),
    changePage: (page: number) => {
      update({ ...state, page });
      window.scrollTo({ top: 0 });
    },
    toggleIndustry: (code: string) =>
      update({
        ...state,
        industries: toggleValue(state.industries, code),
        page: 1,
      }),
    toggleLevel: (level: TaskLevelCode) =>
      update({ ...state, levels: toggleValue(state.levels, level), page: 1 }),
    resetFilters: () =>
      update({ ...state, industries: [], levels: [], page: 1 }),
  };
};
