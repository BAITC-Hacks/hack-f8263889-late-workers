import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Native `<dialog>` opened with `showModal()`: the browser provides the focus
 * trap, the inert page behind it and Escape to close.
 */
export const ConfirmDialog = ({
  open,
  title,
  confirmLabel,
  pending = false,
  error,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      className="bg-card text-card-foreground backdrop:bg-background/80 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-6"
    >
      <div className="space-y-5">
        <h2 id={titleId} className="text-base font-semibold text-balance">
          {title}
        </h2>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
};
