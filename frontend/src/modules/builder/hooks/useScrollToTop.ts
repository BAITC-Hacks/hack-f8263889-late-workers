import { useEffect } from "react";

/** A new step or round replaces the screen, so it should start at its top. */
export const useScrollToTop = (key: string) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
};
