import { ErrorState } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { fieldLabel, skeleton } from "@/common/styles";
import { type BadgeDefinition, badgeNameKey } from "@/modules/gamification";
import { useId } from "react";
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
  badges: BadgeDefinition[] | undefined;
  badgesLoading: boolean;
  badgesError: boolean;
  selectedBadges: string[];
  onToggleIndustry: (code: string) => void;
  onToggleLevel: (level: TaskLevelCode) => void;
  onToggleBadge: (code: string) => void;
  onRetryBadges: () => void;
};

export const CatalogFilters = ({
  industries,
  industriesLoading,
  selectedIndustries,
  selectedLevels,
  badges,
  badgesLoading,
  badgesError,
  selectedBadges,
  onToggleIndustry,
  onToggleLevel,
  onToggleBadge,
  onRetryBadges,
}: CatalogFiltersProps) => {
  const { t } = useTranslation();
  const badgeDescriptionId = useId();

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
      <div className="space-y-2">
        <fieldset
          disabled={badgesLoading || badgesError}
          aria-busy={badgesLoading}
          aria-describedby={badgeDescriptionId}
        >
          <legend className={cn(fieldLabel, "mb-2")}>
            {t("gamification.filter.title")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {badgesLoading
              ? SKELETON_CHIPS.map((width, index) => (
                  <div key={index} className={cn(skeleton, "h-8", width)} />
                ))
              : badges?.map((badge) => (
                  <FilterChip
                    key={badge.code}
                    label={t(badgeNameKey(badge.code), {
                      defaultValue: badge.name,
                    })}
                    checked={selectedBadges.includes(badge.code)}
                    onChange={() => onToggleBadge(badge.code)}
                  />
                ))}
          </div>
        </fieldset>
        <p id={badgeDescriptionId} className="text-muted-foreground text-sm">
          {t("gamification.filter.allSelected")}
        </p>
        {badgesError && (
          <ErrorState
            message={t("gamification.filter.error")}
            onRetry={onRetryBadges}
          />
        )}
      </div>
    </div>
  );
};
