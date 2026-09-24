/**
 * Boolean Operations & Shape Flattening Engine
 * Supports Union, Subtract (Difference), Intersect, and Exclude (XOR)
 * live non-destructive rendering and analytical flattening into first-class ShapeLayers.
 */

import { GroupLayer, Layer, ShapeLayer } from "@/types/scene";
import { computePathBounds } from "../svg/svgPathBounds";
import { transformPath } from "../svg/svgPathTransform";
import { computeBooleanGroupPath } from "./booleanEngine";

export function layerToLocalSvgPath(layer: Layer): string {
  const w = typeof layer.style.width === "number" ? layer.style.width : 100;
  const h = typeof layer.style.height === "number" ? layer.style.height : 100;

  if (layer.type === "shape") {
    const s = layer as ShapeLayer;
    if (s.shapeType === "path" && s.d) {
      // If path has a custom viewBox, scale it to layer width/height
      if (s.viewBox) {
        const parts = s.viewBox.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          const [vbX, vbY, vbW, vbH] = parts;
          if (vbW > 0 && vbH > 0) {
            return transformPath(s.d, {
              dx: -vbX * (w / vbW),
              dy: -vbY * (h / vbH),
              sx: w / vbW,
              sy: h / vbH,
            });
          }
        }
      }
      return s.d;
    }

    if (s.shapeType === "circle" || s.shapeType === "ellipse") {
      const rx = w / 2;
      const ry = h / 2;
      const cx = rx;
      const cy = ry;
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }

    if (s.shapeType === "rectangle") {
      const rx = typeof s.style.borderRadius === "number" ? Math.min(s.style.borderRadius, w / 2, h / 2) : 0;
      if (rx > 0) {
        return `M ${rx} 0 H ${w - rx} A ${rx} ${rx} 0 0 1 ${w} ${rx} V ${h - rx} A ${rx} ${rx} 0 0 1 ${w - rx} ${h} H ${rx} A ${rx} ${rx} 0 0 1 0 ${h - rx} V ${rx} A ${rx} ${rx} 0 0 1 ${rx} 0 Z`;
      }
      return `M 0 0 H ${w} V ${h} H 0 Z`;
    }

    if (s.shapeType === "triangle") {
      return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    }

    if (s.shapeType === "line" || s.shapeType === "arrow") {
      return `M 0 ${h / 2} L ${w} ${h / 2}`;
    }
  }

  // Fallback bounding rectangle
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}

export function flattenBooleanGroup(group: GroupLayer): ShapeLayer | null {
  if (!group || !group.children || group.children.length === 0) return null;

  const grpX = typeof group.style.x === "number" ? group.style.x : 0;
  const grpY = typeof group.style.y === "number" ? group.style.y : 0;
  const baseChild = group.children[0];

  // Compute true 2D vector boolean geometry
  let combinedD = "";
  try {
    combinedD = computeBooleanGroupPath(group);
  } catch {
    // Fallback if booleanEngine encounters an unexpected geometry
  }

  if (!combinedD) {
    const subpaths: string[] = [];
    for (const child of group.children) {
      const childLocalD = layerToLocalSvgPath(child);
      if (!childLocalD) continue;
      const childX = typeof child.style.x === "number" ? child.style.x : 0;
      const childY = typeof child.style.y === "number" ? child.style.y : 0;
      const inGroupD = transformPath(childLocalD, { dx: childX, dy: childY });
      subpaths.push(inGroupD);
    }
    if (subpaths.length === 0) return null;
    combinedD = subpaths.join(" ");
  }

  const bounds = computePathBounds(combinedD);

  // Normalize path coordinates so the layer's local (0, 0) matches bounds.minX, bounds.minY
  const normalizedD = transformPath(combinedD, {
    dx: -bounds.minX,
    dy: -bounds.minY,
  });

  const absX = grpX + bounds.minX;
  const absY = grpY + bounds.minY;
  const absW = Math.max(1, Math.round(bounds.width));
  const absH = Math.max(1, Math.round(bounds.height));

  const fillRule =
    group.booleanOperation === "union" ? "nonzero" : "evenodd";

  const rawFill =
    group.style.backgroundColor ||
    (group.style as any).fillColor ||
    baseChild.style.backgroundColor ||
    (baseChild as any).style?.fillColor;
  const primaryFill = (!rawFill || rawFill === "transparent" || rawFill === "none") ? "transparent" : rawFill;

  const rawStroke =
    group.style.borderColor ||
    baseChild.style.borderColor;
  const primaryStroke = (rawStroke && rawStroke !== "transparent") ? rawStroke : "transparent";

  const rawStrokeWidth =
    typeof group.style.borderWidth === "number"
      ? group.style.borderWidth
      : (typeof baseChild.style.borderWidth === "number" ? baseChild.style.borderWidth : 0);
  const primaryStrokeWidth = rawStrokeWidth;

  const primaryBorderStyle = group.style.borderStyle || baseChild.style.borderStyle || "solid";

  const flattenedShape: ShapeLayer = {
    id: `boolean_flat_${Date.now()}`,
    name: `${group.name || "Boolean"} (Flattened)`,
    type: "shape",
    shapeType: "path",
    d: normalizedD,
    viewBox: `0 0 ${absW} ${absH}`,
    fillRule,
    strokeCap: (baseChild as any).strokeCap || "round",
    strokeJoin: (baseChild as any).strokeJoin || "round",
    style: {
      x: Math.round(absX),
      y: Math.round(absY),
      width: absW,
      height: absH,
      rotation: group.style.rotation || 0,
      opacity: group.style.opacity ?? 1,
      backgroundColor: primaryFill,
      borderColor: primaryStroke,
      borderWidth: primaryStrokeWidth,
      borderStyle: primaryBorderStyle,
    },
  };

  return flattenedShape;
}
