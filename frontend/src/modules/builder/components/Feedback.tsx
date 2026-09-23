import { cn } from "@/common/lib/utils";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Spinner = () => (
  <LoaderCircle className="animate-spin" aria-hidden="true" />
);

export const CharCount = ({ value, max }: { value: number; max: number }) => (
  <span
    className={cn(
      "text-xs tabular-nums",
      value > max ? "text-destructive" : "text-muted-foreground"
    )}
  >
    {value} / {max}
  </span>
);

export const FallbackNotice = () => {
  const { t } = useTranslation();
  return (
    <p className="border-caution/40 bg-caution/10 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
      <TriangleAlert
        className="text-caution mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      {t("builder.fallback")}
    </p>
  );
};

/** Covers the screen while the answers go through two requests. */
export const LoadingOverlay = ({ text }: { text: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="bg-background/80 fixed inset-0 z-40 flex items-center justify-center p-6 backdrop-blur-sm"
  >
    <div className="bg-card flex items-center gap-3 rounded-lg border px-5 py-4 text-sm">
      <LoaderCircle
        className="text-primary size-5 animate-spin"
        aria-hidden="true"
      />
      {text}
    </div>
  </div>
);
