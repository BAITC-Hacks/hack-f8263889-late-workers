import { cn } from "@/common/lib/utils";
import { useTranslation } from "react-i18next";

import { type ProposalsTab, TABS } from "../helpers";

type ProposalTabsProps = {
  value: ProposalsTab;
  counts: Record<ProposalsTab, number>;
  onChange: (tab: ProposalsTab) => void;
};

/** Filter buttons rather than an ARIA tablist: no arrow-key contract needed. */
export const ProposalTabs = ({
  value,
  counts,
  onChange,
}: ProposalTabsProps) => {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("selection.tabs.label")}
      className="flex flex-wrap gap-x-5 gap-y-2 border-b"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={value === tab}
          onClick={() => onChange(tab)}
          className={cn(
            "-mb-px border-b-2 py-2 text-sm font-medium transition-colors",
            value === tab
              ? "border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent"
          )}
        >
          {t(`selection.tabs.${tab}`)}{" "}
          <span className="tabular-nums">{counts[tab]}</span>
        </button>
      ))}
    </div>
  );
};
