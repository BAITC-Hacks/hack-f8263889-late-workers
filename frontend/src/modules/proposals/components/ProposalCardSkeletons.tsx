import { Card } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import { useTranslation } from "react-i18next";

export const ProposalCardSkeletons = ({ count }: { count: number }) => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="space-y-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <Card
          key={index}
          data-testid="proposal-card-skeleton"
          className="flex flex-col gap-4 p-5"
        >
          <div className={cn(skeleton, "h-5 w-40")} />
          <div className="space-y-2">
            <div className={cn(skeleton, "h-5 w-2/3")} />
            <div className={cn(skeleton, "h-4 w-1/3")} />
          </div>
          <div className="space-y-2">
            <div className={cn(skeleton, "h-4 w-full")} />
            <div className={cn(skeleton, "h-4 w-5/6")} />
          </div>
          <div className={cn(skeleton, "h-4 w-48")} />
        </Card>
      ))}
    </div>
  );
};
