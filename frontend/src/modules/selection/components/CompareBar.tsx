import { Button } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { COMPARE_MAX } from "../helpers";

type CompareBarProps = {
  count: number;
  onCompare: () => void;
  onClear: () => void;
};

/** Sticky at the end of the list, so it never covers the toaster or a card. */
export const CompareBar = ({ count, onCompare, onClear }: CompareBarProps) => {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-4 z-10">
      <div className="bg-card flex w-fit flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {t("selection.compare.marked", { count, max: COMPARE_MAX })}
        </span>
        <Button type="button" onClick={onCompare}>
          {t("selection.compare.open", { count })}
        </Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          {t("selection.compare.clear")}
        </Button>
      </div>
    </div>
  );
};
