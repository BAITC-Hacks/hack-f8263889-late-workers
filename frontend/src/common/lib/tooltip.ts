type Rect = Pick<DOMRect, "left" | "top" | "bottom" | "width" | "height">;

export type TooltipViewport = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const EDGE = 8;
const GAP = 8;

export const tooltipBounds = (viewport: TooltipViewport) => ({
  maxWidth: Math.max(1, Math.min(288, viewport.width - EDGE * 2)),
  maxHeight: Math.max(1, viewport.height - EDGE * 2),
});

export const tooltipPosition = (
  trigger: Rect,
  tooltip: Rect,
  viewport: TooltipViewport
) => {
  const minLeft = viewport.left + EDGE;
  const minTop = viewport.top + EDGE;
  const maxLeft = Math.max(
    minLeft,
    viewport.left + viewport.width - tooltip.width - EDGE
  );
  const maxTop = Math.max(
    minTop,
    viewport.top + viewport.height - tooltip.height - EDGE
  );
  const above = trigger.top - tooltip.height - GAP;
  const below = trigger.bottom + GAP;
  const fitsAbove = above >= minTop;
  const fitsBelow = below <= maxTop;
  const moreRoomAbove =
    trigger.top - minTop > viewport.top + viewport.height - trigger.bottom;
  const preferredTop =
    fitsAbove || (!fitsBelow && moreRoomAbove) ? above : below;

  return {
    left: Math.min(Math.max(trigger.left, minLeft), maxLeft),
    top: Math.min(Math.max(preferredTop, minTop), maxTop),
  };
};
