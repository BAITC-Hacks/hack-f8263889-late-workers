import { useEffect, useRef } from "react";

/** Keeps a native `<dialog>` modal in step with `open`. */
export const useModalDialog = (open: boolean) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
};
