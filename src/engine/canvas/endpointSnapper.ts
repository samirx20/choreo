import { Layer, LineLayer, ShapeLayer, GroupLayer } from "@/types/scene";
import { isVectorLine } from "@/utils/layerCapabilities";
import { getLineEndpoints } from "@/engine/vector/lineJoiner";

export interface EndpointSnapTarget {
  x: number;
  y: number;
  type: "endpoint" | "vertex" | "corner" | "center";
  layerId?: string;
  label?: string;
}

export interface EndpointSnapResult {
  x: number;
  y: number;
  target: EndpointSnapTarget;
  distance: number;
}

/**
 * Collects all magnetic snap target points from layers on the active screen.
 * Prioritizes line endpoints and shape vertices.
 */
export function collectScreenSnapTargets(
  layers: Layer[],
  excludeLayerId?: string
): EndpointSnapTarget[] {
  const targets: EndpointSnapTarget[] = [];

  function visitLayer(layer: Layer, parentOffsetX = 0, parentOffsetY = 0) {
    if (excludeLayerId && layer.id === excludeLayerId) {
      return;
    }
    if (layer.hidden) {
      return;
    }

    if (layer.type === "group") {
      const group = layer as GroupLayer;
      const groupX = (layer.style?.x || 0) + parentOffsetX;
      const groupY = (layer.style?.y || 0) + parentOffsetY;
      if (group.children) {
        for (const child of group.children) {
          visitLayer(child, groupX, groupY);
        }
      }
      return;
    }

    if (isVectorLine(layer)) {
      const seg = getLineEndpoints(layer);
      targets.push({
        x: Math.round(seg.x1 + parentOffsetX),
        y: Math.round(seg.y1 + parentOffsetY),
        type: "endpoint",
        layerId: layer.id,
        label: "Line Endpoint",
      });
      targets.push({
        x: Math.round(seg.x2 + parentOffsetX),
        y: Math.round(seg.y2 + parentOffsetY),
        type: "endpoint",
        layerId: layer.id,
        label: "Line Endpoint",
      });
      return;
    }

    if (layer.type === "shape") {
      const shape = layer as ShapeLayer;
      const s = shape.style || {};
      const sx = (s.x || 0) + parentOffsetX;
      const sy = (s.y || 0) + parentOffsetY;
      const sw = typeof s.width === "number" ? s.width : 100;
      const sh = typeof s.height === "number" ? s.height : 100;
      const rot = ((s.rotation || 0) * Math.PI) / 180;

      if (shape.vertices && shape.vertices.length > 0) {
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        for (let i = 0; i < shape.vertices.length; i++) {
          const v = shape.vertices[i];
          let vx = sx + v.x;
          let vy = sy + v.y;
          if (rot !== 0) {
            const relX = vx - cx;
            const relY = vy - cy;
            vx = cx + relX * Math.cos(rot) - relY * Math.sin(rot);
            vy = cy + relX * Math.sin(rot) + relY * Math.cos(rot);
          }
          targets.push({
            x: Math.round(vx),
            y: Math.round(vy),
            type: "vertex",
            layerId: layer.id,
            label: `Corner ${i + 1}`,
          });
        }
        return;
      }

      // Standard shape corners
      targets.push(
        { x: Math.round(sx), y: Math.round(sy), type: "corner", layerId: layer.id, label: "Top Left" },
        { x: Math.round(sx + sw), y: Math.round(sy), type: "corner", layerId: layer.id, label: "Top Right" },
        { x: Math.round(sx + sw), y: Math.round(sy + sh), type: "corner", layerId: layer.id, label: "Bottom Right" },
        { x: Math.round(sx), y: Math.round(sy + sh), type: "corner", layerId: layer.id, label: "Bottom Left" },
        { x: Math.round(sx + sw / 2), y: Math.round(sy + sh / 2), type: "center", layerId: layer.id, label: "Center" }
      );
    }
  }

  for (const layer of layers) {
    visitLayer(layer);
  }

  return targets;
}

/**
 * Searches candidates for the nearest snap point within threshold distance.
 */
export function findNearestSnapTarget(
  pos: { x: number; y: number },
  targets: EndpointSnapTarget[],
  threshold = 16
): EndpointSnapResult | null {
  let closest: EndpointSnapTarget | null = null;
  let minDistance = Infinity;

  for (const target of targets) {
    const d = Math.hypot(target.x - pos.x, target.y - pos.y);
    if (d <= threshold && d < minDistance) {
      minDistance = d;
      closest = target;
    }
  }

  if (!closest) return null;

  return {
    x: closest.x,
    y: closest.y,
    target: closest,
    distance: minDistance,
  };
}
