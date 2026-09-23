import { useToastStore } from "@/common/lib/toast";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Toaster = () => {
  const { t } = useTranslation();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-card text-card-foreground pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t("common.close")}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};
