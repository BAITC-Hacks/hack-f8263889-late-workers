import { Select } from "@/common/components/ui";
import { fieldLabel } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { TASK_SORTS, type TaskSort } from "../types";

type SortSelectProps = {
  value: TaskSort;
  onChange: (sort: TaskSort) => void;
};

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-xs space-y-2">
      <label htmlFor="catalog-sort" className={fieldLabel}>
        {t("catalog.sort.label")}
      </label>
      <Select
        id="catalog-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as TaskSort)}
      >
        {TASK_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`catalog.sort.${sort}`)}
          </option>
        ))}
      </Select>
    </div>
  );
};
