import { useEffect } from "react";

import { isInAppLeave } from "../helpers";

/**
 * Asks before leaving while `active`. Closing or reloading the tab gets the
 * browser's own prompt; the app's links are caught before the router sees them.
 */
export const useLeaveGuard = (active: boolean, message: string) => {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (isInAppLeave(event) && !window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
};
