import { Card } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { cardGrid, skeleton } from "@/common/styles";
import { useTranslation } from "react-i18next";

export const TeamCardSkeletons = ({ count }: { count: number }) => {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className={cardGrid}>
      {Array.from({ length: count }, (_, index) => (
        <Card
          key={index}
          data-testid="team-card-skeleton"
          className="flex flex-col gap-4 p-5"
        >
          <div className={cn(skeleton, "h-5 w-20")} />
          <div className={cn(skeleton, "h-5 w-2/3")} />
          <div className="flex gap-1.5">
            <div className={cn(skeleton, "h-5 w-16")} />
            <div className={cn(skeleton, "h-5 w-20")} />
            <div className={cn(skeleton, "h-5 w-14")} />
          </div>
          <div className={cn(skeleton, "h-4 w-32")} />
        </Card>
      ))}
    </div>
  );
};

export const TeamPageSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="space-y-8"
    >
      <div className="space-y-3">
        <div className={cn(skeleton, "h-5 w-20")} />
        <div className={cn(skeleton, "h-8 w-1/2")} />
        <div className={cn(skeleton, "h-4 w-32")} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={cn(skeleton, "h-16 w-full")} />
        ))}
      </div>
    </div>
  );
};
