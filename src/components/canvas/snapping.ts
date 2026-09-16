export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number; // canvas pixel position
  label?: string;
}

export interface SnappingResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

const SNAP_THRESHOLD = 8; // Snap within 8 pixels

/**
 * Calculates magnetic snapping for a dragged layer against canvas boundaries and siblings.
 */
export function calculateSnapping(
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  siblingBoxes: { x: number; y: number; width: number; height: number }[]
): SnappingResult {
  let snappedX = targetX;
  let snappedY = targetY;
  const guides: SnapGuide[] = [];

  const targetCenterX = targetX + targetWidth / 2;
  const targetCenterY = targetY + targetHeight / 2;
  const targetRight = targetX + targetWidth;
  const targetBottom = targetY + targetHeight;

  // 1. Canvas Center Snapping
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  if (Math.abs(targetCenterX - canvasCenterX) < SNAP_THRESHOLD) {
    snappedX = canvasCenterX - targetWidth / 2;
    guides.push({
      type: "vertical",
      position: canvasCenterX,
      label: "Canvas Center",
    });
  } else if (Math.abs(targetX - 0) < SNAP_THRESHOLD) {
    snappedX = 0;
    guides.push({ type: "vertical", position: 0 });
  } else if (Math.abs(targetRight - canvasWidth) < SNAP_THRESHOLD) {
    snappedX = canvasWidth - targetWidth;
    guides.push({ type: "vertical", position: canvasWidth });
  }

  if (Math.abs(targetCenterY - canvasCenterY) < SNAP_THRESHOLD) {
    snappedY = canvasCenterY - targetHeight / 2;
    guides.push({
      type: "horizontal",
      position: canvasCenterY,
      label: "Canvas Middle",
    });
  } else if (Math.abs(targetY - 0) < SNAP_THRESHOLD) {
    snappedY = 0;
    guides.push({ type: "horizontal", position: 0 });
  } else if (Math.abs(targetBottom - canvasHeight) < SNAP_THRESHOLD) {
    snappedY = canvasHeight - targetHeight;
    guides.push({ type: "horizontal", position: canvasHeight });
  }

  // 2. Sibling Edges Snapping
  for (const sibling of siblingBoxes) {
    const siblingCenterX = sibling.x + sibling.width / 2;
    const siblingCenterY = sibling.y + sibling.height / 2;
    const siblingRight = sibling.x + sibling.width;
    const siblingBottom = sibling.y + sibling.height;

    // Vertical snaps
    if (Math.abs(targetX - sibling.x) < SNAP_THRESHOLD) {
      snappedX = sibling.x;
      guides.push({ type: "vertical", position: sibling.x });
    } else if (Math.abs(targetRight - siblingRight) < SNAP_THRESHOLD) {
      snappedX = siblingRight - targetWidth;
      guides.push({ type: "vertical", position: siblingRight });
    } else if (Math.abs(targetCenterX - siblingCenterX) < SNAP_THRESHOLD) {
      snappedX = siblingCenterX - targetWidth / 2;
      guides.push({ type: "vertical", position: siblingCenterX });
    }

    // Horizontal snaps
    if (Math.abs(targetY - sibling.y) < SNAP_THRESHOLD) {
      snappedY = sibling.y;
      guides.push({ type: "horizontal", position: sibling.y });
    } else if (Math.abs(targetBottom - siblingBottom) < SNAP_THRESHOLD) {
      snappedY = siblingBottom - targetHeight;
      guides.push({ type: "horizontal", position: siblingBottom });
    } else if (Math.abs(targetCenterY - siblingCenterY) < SNAP_THRESHOLD) {
      snappedY = siblingCenterY - targetHeight / 2;
      guides.push({ type: "horizontal", position: siblingCenterY });
    }
  }

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY),
    guides,
  };
}
