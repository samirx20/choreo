/**
 * Vector Path Decomposition Engine ("Explode Vector Paths")
 * Unwraps vector groups and hoists each path/shape to root canvas coordinates
 * with 0.0000px visual shift invariance, assigning tight bounding boxes and viewBoxes.
 */

import { GroupLayer, Layer, ShapeLayer } from "@/types/scene";
import { computePathBounds } from "./svgPathBounds";

export function decomposeVectorGroup(group: GroupLayer): Layer[] {
  if (!group || group.type !== "group" || !group.children) return [];

  const grpX = typeof group.style.x === "number" ? group.style.x : 0;
  const grpY = typeof group.style.y === "number" ? group.style.y : 0;
  const grpW = typeof group.style.width === "number" ? group.style.width : 100;
  const grpH = typeof group.style.height === "number" ? group.style.height : 100;
  const grpOpacity = typeof group.style.opacity === "number" ? group.style.opacity : 1;

  return group.children.map((child) => {
    // If it's a path shape with a viewBox from SVG import, compute tight bounding box
    if (child.type === "shape" && (child as ShapeLayer).shapeType === "path" && (child as ShapeLayer).d) {
      const pathLayer = child as ShapeLayer;
      const d = pathLayer.d!;

      if (pathLayer.viewBox) {
        const vbParts = pathLayer.viewBox.trim().split(/[\s,]+/).map(Number);
        if (vbParts.length === 4 && vbParts.every((n) => Number.isFinite(n))) {
          const [vbMinX, vbMinY, vbW, vbH] = vbParts;
          const bounds = computePathBounds(d);

          if (vbW > 0 && vbH > 0 && bounds.width > 0 && bounds.height > 0) {
            const sx = grpW / vbW;
            const sy = grpH / vbH;

            const absX = grpX + (bounds.minX - vbMinX) * sx;
            const absY = grpY + (bounds.minY - vbMinY) * sy;
            const absW = Math.max(1, bounds.width * sx);
            const absH = Math.max(1, bounds.height * sy);

            return {
              ...pathLayer,
              viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
              style: {
                ...pathLayer.style,
                x: Math.round(absX),
                y: Math.round(absY),
                width: Math.round(absW),
                height: Math.round(absH),
                opacity: (pathLayer.style.opacity ?? 1) * grpOpacity,
              },
            };
          }
        }
      }
    }

    // Standard translation hoisting for non-path or unscaled children
    const childX = typeof child.style.x === "number" ? child.style.x : 0;
    const childY = typeof child.style.y === "number" ? child.style.y : 0;

    return {
      ...child,
      style: {
        ...child.style,
        x: grpX + childX,
        y: grpY + childY,
        opacity: (child.style.opacity ?? 1) * grpOpacity,
      },
    };
  });
}
