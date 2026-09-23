import { type RefObject, useLayoutEffect, useState } from "react";

/** Whether a line-clamped element hides part of its text; follows resizes. */
export const useIsClamped = (ref: RefObject<HTMLElement | null>) => {
  const [clamped, setClamped] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return clamped;
};
