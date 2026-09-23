import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BUILDER_STEPS, type BuilderStep } from "../helpers";

export const BuilderSteps = ({ active }: { active: BuilderStep }) => {
  const { t } = useTranslation();
  const activeIndex = BUILDER_STEPS.indexOf(active);

  return (
    <nav aria-label={t("builder.steps.label")}>
      <ol className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {BUILDER_STEPS.map((step, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <li
              key={step}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 text-sm",
                current
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
                  current &&
                    "border-primary bg-primary text-primary-foreground",
                  done && "border-primary text-primary"
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {t(`builder.steps.${step}`)}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const BuilderSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      data-testid="builder-skeleton"
      className="space-y-8"
    >
      <div className="space-y-4">
        <div className={cn(skeleton, "h-9 w-72")} />
        <div className={cn(skeleton, "h-5 w-40")} />
      </div>
      <div className="flex flex-wrap gap-6">
        {BUILDER_STEPS.map((step) => (
          <div key={step} className={cn(skeleton, "h-6 w-28")} />
        ))}
      </div>
      <div className="max-w-3xl space-y-4">
        <div className={cn(skeleton, "h-12 w-full")} />
        <div className={cn(skeleton, "h-28 w-full")} />
        <div className={cn(skeleton, "h-28 w-full")} />
        <div className={cn(skeleton, "h-28 w-full")} />
      </div>
    </div>
  );
};
