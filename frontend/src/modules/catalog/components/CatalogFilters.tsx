import { cn } from "@/common/lib/utils";
import { fieldLabel, skeleton } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { levelLabelKey } from "../helpers";
import { type Industry, TASK_LEVELS, type TaskLevelCode } from "../types";
import { FilterChip } from "./FilterChip";

const SKELETON_CHIPS = ["w-20", "w-24", "w-16", "w-28", "w-20", "w-24"];

type CatalogFiltersProps = {
  industries: Industry[] | undefined;
  industriesLoading: boolean;
  selectedIndustries: string[];
  selectedLevels: TaskLevelCode[];
  onToggleIndustry: (code: string) => void;
  onToggleLevel: (level: TaskLevelCode) => void;
};

export const CatalogFilters = ({
  industries,
  industriesLoading,
  selectedIndustries,
  selectedLevels,
  onToggleIndustry,
  onToggleLevel,
}: CatalogFiltersProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <fieldset disabled={industriesLoading} aria-busy={industriesLoading}>
        <legend className={cn(fieldLabel, "mb-2")}>
          {t("catalog.filters.industry")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {industriesLoading
            ? SKELETON_CHIPS.map((width, index) => (
                <div key={index} className={cn(skeleton, "h-8", width)} />
              ))
            : industries?.map((industry) => (
                <FilterChip
                  key={industry.code}
                  label={industry.name}
                  checked={selectedIndustries.includes(industry.code)}
                  onChange={() => onToggleIndustry(industry.code)}
                />
              ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={cn(fieldLabel, "mb-2")}>
          {t("catalog.filters.level")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TASK_LEVELS.map((level) => (
            <FilterChip
              key={level}
              label={t(levelLabelKey(level))}
              checked={selectedLevels.includes(level)}
              onChange={() => onToggleLevel(level)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
};
