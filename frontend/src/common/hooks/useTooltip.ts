import { tooltipBounds, tooltipPosition } from "@/common/lib/tooltip";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export const useTooltip = () => {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  const clearLeaveTimer = () => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };

  const onMouseEnter = () => {
    clearLeaveTimer();
    setHovered(true);
    setDismissed(false);
  };

  const onMouseLeave = () => {
    clearLeaveTimer();
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  };

  useEffect(() => clearLeaveTimer, []);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!open || !trigger || !tooltip) return;

    const measure = () => {
      const visual = window.visualViewport;
      const viewport = {
        left: visual?.offsetLeft ?? 0,
        top: visual?.offsetTop ?? 0,
        width: visual?.width ?? document.documentElement.clientWidth,
        height: visual?.height ?? document.documentElement.clientHeight,
      };
      const bounds = tooltipBounds(viewport);
      tooltip.style.maxWidth = `${bounds.maxWidth}px`;
      tooltip.style.maxHeight = `${bounds.maxHeight}px`;
      const position = tooltipPosition(
        trigger.getBoundingClientRect(),
        tooltip.getBoundingClientRect(),
        viewport
      );
      tooltip.style.left = `${position.left}px`;
      tooltip.style.top = `${position.top}px`;
      tooltip.style.visibility = "visible";
    };

    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trigger);
    observer.observe(tooltip);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    document.addEventListener("keydown", dismiss, true);

    return () => {
      tooltip.style.visibility = "hidden";
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      document.removeEventListener("keydown", dismiss, true);
    };
  }, [open]);

  return {
    id,
    open,
    triggerRef,
    tooltipRef,
    onMouseEnter,
    onMouseLeave,
    onFocus: () => {
      setFocused(true);
      setDismissed(false);
    },
    onBlur: () => setFocused(false),
  };
};
