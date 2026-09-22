import { Layer } from "@/types/scene";

export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getLayerBounds(
  layer: Layer,
  screenRect: DOMRect,
  domScale: number
): LayerBounds {
  const el = document.getElementById(`layer-${layer.id}`);
  if (el) {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - screenRect.left) / domScale,
      y: (r.top - screenRect.top) / domScale,
      width: r.width / domScale,
      height: r.height / domScale,
    };
  }
  return {
    x: layer.style.x || 0,
    y: layer.style.y || 0,
    width: typeof layer.style.width === "number" ? layer.style.width : 200,
    height: typeof layer.style.height === "number" ? layer.style.height : 100,
  };
}
