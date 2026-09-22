export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number; // canvas pixel position (x for vertical, y for horizontal)
  start?: number;   // cross-axis start coordinate (y for vertical, x for horizontal)
  end?: number;     // cross-axis end coordinate
  label?: string;
  isCanvasAxis?: boolean;
}

export interface SnappingResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates magnetic snapping for a dragged layer against canvas boundaries and siblings.
 * Snapping threshold is normalized by effectiveScale to ensure invariant screen-space radius (8px).
 * Generates segment-bounded smart guides connecting aligned primitives with zero visual clutter.
 */
export function calculateSnapping(
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  siblingBoxes: BoundingBox[],
  effectiveScale = 1.0
): SnappingResult {
  const SNAP_THRESHOLD = 8 / Math.max(effectiveScale, 0.001);
  let snappedX = targetX;
  let snappedY = targetY;
  const rawGuides: SnapGuide[] = [];

  const targetCenterX = targetX + targetWidth / 2;
  const targetCenterY = targetY + targetHeight / 2;
  const targetRight = targetX + targetWidth;
  const targetBottom = targetY + targetHeight;

  // 1. Canvas Boundary & Center Snapping (Primary Anchors)
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  let bestSnapDiffX = Infinity;
  let bestSnapX = targetX;
  let bestXGuide: SnapGuide | null = null;

  let bestSnapDiffY = Infinity;
  let bestSnapY = targetY;
  let bestYGuide: SnapGuide | null = null;

  // Canvas Center X
  if (Math.abs(targetCenterX - canvasCenterX) < SNAP_THRESHOLD) {
    bestSnapDiffX = Math.abs(targetCenterX - canvasCenterX);
    bestSnapX = canvasCenterX - targetWidth / 2;
    bestXGuide = {
      type: "vertical",
      position: canvasCenterX,
      start: 0,
      end: canvasHeight,
      label: "Center",
      isCanvasAxis: true,
    };
  } else if (Math.abs(targetX - 0) < SNAP_THRESHOLD) {
    bestSnapDiffX = Math.abs(targetX - 0);
    bestSnapX = 0;
    bestXGuide = {
      type: "vertical",
      position: 0,
      start: 0,
      end: canvasHeight,
      isCanvasAxis: true,
    };
  } else if (Math.abs(targetRight - canvasWidth) < SNAP_THRESHOLD) {
    bestSnapDiffX = Math.abs(targetRight - canvasWidth);
    bestSnapX = canvasWidth - targetWidth;
    bestXGuide = {
      type: "vertical",
      position: canvasWidth,
      start: 0,
      end: canvasHeight,
      isCanvasAxis: true,
    };
  }

  // Canvas Center Y
  if (Math.abs(targetCenterY - canvasCenterY) < SNAP_THRESHOLD) {
    bestSnapDiffY = Math.abs(targetCenterY - canvasCenterY);
    bestSnapY = canvasCenterY - targetHeight / 2;
    bestYGuide = {
      type: "horizontal",
      position: canvasCenterY,
      start: 0,
      end: canvasWidth,
      label: "Middle",
      isCanvasAxis: true,
    };
  } else if (Math.abs(targetY - 0) < SNAP_THRESHOLD) {
    bestSnapDiffY = Math.abs(targetY - 0);
    bestSnapY = 0;
    bestYGuide = {
      type: "horizontal",
      position: 0,
      start: 0,
      end: canvasWidth,
      isCanvasAxis: true,
    };
  } else if (Math.abs(targetBottom - canvasHeight) < SNAP_THRESHOLD) {
    bestSnapDiffY = Math.abs(targetBottom - canvasHeight);
    bestSnapY = canvasHeight - targetHeight;
    bestYGuide = {
      type: "horizontal",
      position: canvasHeight,
      start: 0,
      end: canvasWidth,
      isCanvasAxis: true,
    };
  }

  // 2. Sibling Edges & Cross-Edge Adjacent Snapping
  for (const sibling of siblingBoxes) {
    const siblingCenterX = sibling.x + sibling.width / 2;
    const siblingCenterY = sibling.y + sibling.height / 2;
    const siblingRight = sibling.x + sibling.width;
    const siblingBottom = sibling.y + sibling.height;

    // Segment bounds: span across the aligned pair with 8px margin
    const yMin = Math.min(targetY, sibling.y) - 8;
    const yMax = Math.max(targetBottom, siblingBottom) + 8;
    const xMin = Math.min(targetX, sibling.x) - 8;
    const xMax = Math.max(targetRight, siblingRight) + 8;

    // --- Vertical Snaps (X-Axis) ---
    // Left to Left
    const diffLeftToLeft = Math.abs(targetX - sibling.x);
    if (diffLeftToLeft < SNAP_THRESHOLD && diffLeftToLeft < bestSnapDiffX) {
      bestSnapDiffX = diffLeftToLeft;
      bestSnapX = sibling.x;
      bestXGuide = { type: "vertical", position: sibling.x, start: yMin, end: yMax };
    }
    // Right to Right
    const diffRightToRight = Math.abs(targetRight - siblingRight);
    if (diffRightToRight < SNAP_THRESHOLD && diffRightToRight < bestSnapDiffX) {
      bestSnapDiffX = diffRightToRight;
      bestSnapX = siblingRight - targetWidth;
      bestXGuide = { type: "vertical", position: siblingRight, start: yMin, end: yMax };
    }
    // Center to Center
    const diffCenterX = Math.abs(targetCenterX - siblingCenterX);
    if (diffCenterX < SNAP_THRESHOLD && diffCenterX < bestSnapDiffX) {
      bestSnapDiffX = diffCenterX;
      bestSnapX = siblingCenterX - targetWidth / 2;
      bestXGuide = { type: "vertical", position: siblingCenterX, start: yMin, end: yMax };
    }
    // Adjacent: Left to Sibling Right
    const diffLeftToSiblingRight = Math.abs(targetX - siblingRight);
    if (diffLeftToSiblingRight < SNAP_THRESHOLD && diffLeftToSiblingRight < bestSnapDiffX) {
      bestSnapDiffX = diffLeftToSiblingRight;
      bestSnapX = siblingRight;
      bestXGuide = { type: "vertical", position: siblingRight, start: yMin, end: yMax };
    }
    // Adjacent: Right to Sibling Left
    const diffRightToSiblingLeft = Math.abs(targetRight - sibling.x);
    if (diffRightToSiblingLeft < SNAP_THRESHOLD && diffRightToSiblingLeft < bestSnapDiffX) {
      bestSnapDiffX = diffRightToSiblingLeft;
      bestSnapX = sibling.x - targetWidth;
      bestXGuide = { type: "vertical", position: sibling.x, start: yMin, end: yMax };
    }

    // --- Horizontal Snaps (Y-Axis) ---
    // Top to Top
    const diffTopToTop = Math.abs(targetY - sibling.y);
    if (diffTopToTop < SNAP_THRESHOLD && diffTopToTop < bestSnapDiffY) {
      bestSnapDiffY = diffTopToTop;
      bestSnapY = sibling.y;
      bestYGuide = { type: "horizontal", position: sibling.y, start: xMin, end: xMax };
    }
    // Bottom to Bottom
    const diffBottomToBottom = Math.abs(targetBottom - siblingBottom);
    if (diffBottomToBottom < SNAP_THRESHOLD && diffBottomToBottom < bestSnapDiffY) {
      bestSnapDiffY = diffBottomToBottom;
      bestSnapY = siblingBottom - targetHeight;
      bestYGuide = { type: "horizontal", position: siblingBottom, start: xMin, end: xMax };
    }
    // Center to Center
    const diffCenterY = Math.abs(targetCenterY - siblingCenterY);
    if (diffCenterY < SNAP_THRESHOLD && diffCenterY < bestSnapDiffY) {
      bestSnapDiffY = diffCenterY;
      bestSnapY = siblingCenterY - targetHeight / 2;
      bestYGuide = { type: "horizontal", position: siblingCenterY, start: xMin, end: xMax };
    }
    // Adjacent: Top to Sibling Bottom
    const diffTopToSiblingBottom = Math.abs(targetY - siblingBottom);
    if (diffTopToSiblingBottom < SNAP_THRESHOLD && diffTopToSiblingBottom < bestSnapDiffY) {
      bestSnapDiffY = diffTopToSiblingBottom;
      bestSnapY = siblingBottom;
      bestYGuide = { type: "horizontal", position: siblingBottom, start: xMin, end: xMax };
    }
    // Adjacent: Bottom to Sibling Top
    const diffBottomToSiblingTop = Math.abs(targetBottom - sibling.y);
    if (diffBottomToSiblingTop < SNAP_THRESHOLD && diffBottomToSiblingTop < bestSnapDiffY) {
      bestSnapDiffY = diffBottomToSiblingTop;
      bestSnapY = sibling.y - targetHeight;
      bestYGuide = { type: "horizontal", position: sibling.y, start: xMin, end: xMax };
    }
  }

  if (bestXGuide) {
    snappedX = bestSnapX;
    rawGuides.push(bestXGuide);
  }
  if (bestYGuide) {
    snappedY = bestSnapY;
    rawGuides.push(bestYGuide);
  }

  // 3. Equidistant Distribution & Distance Badges
  if (siblingBoxes.length >= 2) {
    for (let i = 0; i < siblingBoxes.length; i++) {
      for (let j = i + 1; j < siblingBoxes.length; j++) {
        const b1 = siblingBoxes[i];
        const b2 = siblingBoxes[j];

        // Horizontal equidistant spacing: b1 on left, target in middle, b2 on right
        const leftBox = b1.x < b2.x ? b1 : b2;
        const rightBox = b1.x < b2.x ? b2 : b1;
        const leftEdge = leftBox.x + leftBox.width;
        const rightEdge = rightBox.x;

        if (targetX >= leftEdge && targetRight <= rightEdge) {
          const availableSpace = rightEdge - leftEdge - targetWidth;
          if (availableSpace > 0) {
            const equalGap = availableSpace / 2;
            const targetEquidistantX = leftEdge + equalGap;
            if (Math.abs(targetX - targetEquidistantX) < SNAP_THRESHOLD) {
              snappedX = targetEquidistantX;
              const roundedGap = Math.round(equalGap);
              const spanYMin = Math.min(targetY, leftBox.y, rightBox.y) - 6;
              const spanYMax = Math.max(targetBottom, leftBox.y + leftBox.height, rightBox.y + rightBox.height) + 6;

              rawGuides.push({
                type: "vertical",
                position: leftEdge,
                start: spanYMin,
                end: spanYMax,
                label: `${roundedGap}px`,
              });
              rawGuides.push({
                type: "vertical",
                position: rightEdge,
                start: spanYMin,
                end: spanYMax,
                label: `${roundedGap}px`,
              });
            }
          }
        }

        // Vertical equidistant spacing: topBox above, target in middle, bottomBox below
        const topBox = b1.y < b2.y ? b1 : b2;
        const bottomBox = b1.y < b2.y ? b2 : b1;
        const topEdge = topBox.y + topBox.height;
        const bottomEdge = bottomBox.y;

        if (targetY >= topEdge && targetBottom <= bottomEdge) {
          const availableSpace = bottomEdge - topEdge - targetHeight;
          if (availableSpace > 0) {
            const equalGap = availableSpace / 2;
            const targetEquidistantY = topEdge + equalGap;
            if (Math.abs(targetY - targetEquidistantY) < SNAP_THRESHOLD) {
              snappedY = targetEquidistantY;
              const roundedGap = Math.round(equalGap);
              const spanXMin = Math.min(targetX, topBox.x, bottomBox.x) - 6;
              const spanXMax = Math.max(targetRight, topBox.x + topBox.width, bottomBox.x + bottomBox.width) + 6;

              rawGuides.push({
                type: "horizontal",
                position: topEdge,
                start: spanXMin,
                end: spanXMax,
                label: `${roundedGap}px`,
              });
              rawGuides.push({
                type: "horizontal",
                position: bottomEdge,
                start: spanXMin,
                end: spanXMax,
                label: `${roundedGap}px`,
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate guides by type and position
  const seen = new Set<string>();
  const guides: SnapGuide[] = [];
  for (const g of rawGuides) {
    const key = `${g.type}:${Math.round(g.position)}`;
    if (!seen.has(key)) {
      seen.add(key);
      guides.push(g);
    }
  }

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY),
    guides,
  };
}
