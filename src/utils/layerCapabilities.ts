import type { Layer } from "@/types/layers";

/**
 * Checks if a layer represents a 1D vector line or arrow.
 */
export function isVectorLine(layer?: Layer | null): boolean {
  if (!layer) return false;
  return (
    layer.type === "line" ||
    (layer.type === "shape" &&
      ((layer as any).shapeType === "line" || (layer as any).shapeType === "arrow"))
  );
}

/**
 * Checks if a layer represents a circular or elliptical primitive.
 */
export function isCircle(layer?: Layer | null): boolean {
  if (!layer) return false;
  return (
    layer.type === "shape" &&
    ((layer as any).shapeType === "circle" || (layer as any).shapeType === "ellipse")
  );
}

/**
 * Checks if a layer is a star shape.
 */
export function isStar(layer?: Layer | null): boolean {
  if (!layer) return false;
  return layer.type === "shape" && (layer as any).shapeType === "star";
}

/**
 * Checks if a layer is an N-gon polygon or triangle.
 */
export function isPolygon(layer?: Layer | null): boolean {
  if (!layer) return false;
  return (
    layer.type === "polygon" ||
    (layer.type === "shape" &&
      ((layer as any).shapeType === "polygon" || (layer as any).shapeType === "triangle"))
  );
}

/**
 * Checks if a layer is an image or video raster/stream container.
 */
export function isMedia(layer?: Layer | null): boolean {
  if (!layer) return false;
  return layer.type === "image" || layer.type === "video";
}

/**
 * Checks if a layer is an Auto-Layout / Frame container.
 */
export function isFrame(layer?: Layer | null): boolean {
  if (!layer) return false;
  return layer.type === "frame";
}

/**
 * Physical form check: Does this layer have 2D rectangular corners that can be rounded?
 * - True: Rectangles, Frames, Images, Videos, or Text with background card.
 * - False: 1D Lines, Arrows, Circles (100% fixed), Stars, Polygons, Icons.
 */
export function canHaveBorderRadius(layer?: Layer | null): boolean {
  if (!layer) return false;
  if (isVectorLine(layer)) return false;
  if (isCircle(layer)) return false;
  if (isStar(layer)) return false;
  if (isPolygon(layer)) return false;
  if (layer.type === "icon") return false;
  if (layer.type === "text" || layer.type === "chunk" || layer.type === "counter") {
    // Only text with an explicit background card fill can have corner radius
    return Boolean(layer.style?.backgroundColor && layer.style.backgroundColor !== "transparent");
  }
  return true;
}

/**
 * Physical form check: Can this layer have a 2D surface Fill?
 * - False for 1D lines and arrows (lines are strokes only).
 */
export function canHaveFill(layer?: Layer | null): boolean {
  if (!layer) return false;
  if (isVectorLine(layer)) return false;
  return true;
}

/**
 * Physical form check: Can this layer support Glass / Backdrop Blur effects?
 * - True only for closed 2D surfaces (Rectangles, Frames).
 * - False for 1D lines, icons, and bare text.
 */
export function canHaveGlass(layer?: Layer | null): boolean {
  if (!layer) return false;
  if (isVectorLine(layer)) return false;
  if (layer.type === "icon") return false;
  if (layer.type === "text" || layer.type === "chunk" || layer.type === "counter") {
    return Boolean(layer.style?.backgroundColor && layer.style.backgroundColor !== "transparent");
  }
  return true;
}

/**
 * Physical form check: Can this layer support SVG Trim Paths (Draw-On)?
 */
export function canHaveTrimPath(layer?: Layer | null): boolean {
  if (!layer) return false;
  if (isVectorLine(layer)) return true;
  if (layer.type === "shape") return true;
  return false;
}
