import { useModalDialog } from "@/common/lib/useModalDialog";
import { LoaderCircle } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  destructive?: boolean;
  /** Extra body between the text and the buttons, e.g. a comment field. */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Native `<dialog>` opened with `showModal()`: the browser provides the focus
 * trap, the inert page behind it, Escape to close and focus restore.
 */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  destructive = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const ref = useModalDialog(open);
  const titleId = useId();
  const descriptionId = useId();
  const openRef = useRef(open);
  openRef.current = open;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      // Chromium may close a dialog on a repeated Escape without a
      // cancelable `cancel` event; keep the parent's state in step.
      onClose={() => {
        if (openRef.current) onCancel();
      }}
      className="bg-card text-card-foreground backdrop:bg-foreground/40 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-6"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 id={titleId} className="text-base font-semibold text-balance">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-muted-foreground text-sm">
              {description}
            </p>
          )}
        </div>
        {children}
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
