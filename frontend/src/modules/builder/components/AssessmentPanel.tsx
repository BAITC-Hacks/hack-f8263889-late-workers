import { Section } from "@/common/components/layout";
import { Badge, Tooltip } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { blockNameKey, qualityBadgeVariant, qualityNameKey } from "../helpers";
import type { Assessment } from "../types";

export const QualityBadge = ({
  quality,
}: {
  quality: Assessment["quality"];
}) => {
  const { t } = useTranslation();
  return (
    <Badge variant={qualityBadgeVariant(quality.code)}>
      {t(qualityNameKey(quality.code), { defaultValue: quality.name })}
    </Badge>
  );
};

export const AssessmentPanel = ({
  assessment,
}: {
  assessment: Assessment[];
}) => {
  const { t } = useTranslation();
  return (
    <Section title={t("builder.assessment.title")} divider={false}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {assessment.map((entry) => (
          <li key={entry.block}>
            <Tooltip content={entry.reason} className="w-full">
              <span className="flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <span className="text-sm font-medium">
                  {t(blockNameKey(entry.block), { defaultValue: entry.name })}
                </span>
                <QualityBadge quality={entry.quality} />
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </Section>
  );
};
