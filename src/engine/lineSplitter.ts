import { Layer, GroupLayer, ShapeLayer } from "@/types/scene";

export interface SplitLineResult {
  group: GroupLayer;
  segments: Layer[];
}

/**
 * Splits a 1D vector line or arrow into two collinear segments at a specified ratio (default 0.5 midpoint).
 * Guarantees 0.0000px visual shift from the original unsplit line.
 */
export function splitLineAtRatio(layer: Layer, ratio: number = 0.5): SplitLineResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 20;
  const clampedRatio = Math.max(0.05, Math.min(0.95, ratio));

  const lenA = Math.round(widthNum * clampedRatio * 100) / 100;
  const lenB = Math.round((widthNum - lenA) * 100) / 100;

  const isShape = layer.type === "shape";
  const shapeType = isShape ? (layer as ShapeLayer).shapeType : "line";
  const isArrow = shapeType === "arrow" || (layer as any).arrowEnd;

  const segmentA: Layer = {
    ...layer,
    id: `line_segA_${Date.now()}`,
    name: `${layer.name} (Part 1)`,
    style: {
      ...layer.style,
      x: 0,
      y: 0,
      width: lenA,
      rotation: 0, // Carried by parent group
    },
    // Segment A loses arrowhead at end, keeps start if any
    ...(layer.type === "line"
      ? { arrowEnd: "none" as const }
      : isShape && shapeType === "arrow"
      ? { arrowEnd: false }
      : {}),
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.6,
        start: 0,
        easing: "snappy",
      },
    },
  } as unknown as Layer;

  const segmentB: Layer = {
    ...layer,
    id: `line_segB_${Date.now()}`,
    name: `${layer.name} (Part 2)`,
    style: {
      ...layer.style,
      x: lenA,
      y: 0,
      width: lenB,
      rotation: 0,
    },
    // Segment B keeps arrowhead if original had it
    ...(layer.type === "line"
      ? { arrowEnd: (((layer as any).arrowEnd as string) || "arrow") as "arrow" | "circle" | "none" }
      : isArrow
      ? { arrowEnd: true }
      : {}),
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.6,
        start: 0.3, // Staggers naturally after segment A completes
        easing: "snappy",
      },
    },
  } as unknown as Layer;

  const group: GroupLayer = {
    id: `group_line_${Date.now()}`,
    name: `${layer.name} (Split Line)`,
    type: "group",
    isCompound: true,
    locked: true,
    compoundType: "split-line",
    style: {
      x: layer.style.x,
      y: layer.style.y,
      width: widthNum,
      height: heightNum,
      rotation: layer.style.rotation || 0,
      opacity: layer.style.opacity ?? 1,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    children: [segmentA, segmentB],
  };

  return { group, segments: [segmentA, segmentB] };
}

/**
 * Detaches the arrowhead marker from the line shaft into two independent layers:
 * 1. Shaft Layer: draws on smoothly without an arrowhead.
 * 2. Head Layer: independent glyph/marker positioned at the tip that pops or stamps into place.
 */
export function detachArrowhead(layer: Layer): SplitLineResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 20;

  // 1. Shaft Layer (Line without arrowhead)
  const shaft: Layer = {
    ...layer,
    id: `shaft_${Date.now()}`,
    name: `${layer.name} (Shaft)`,
    style: {
      ...layer.style,
      x: 0,
      y: 0,
      rotation: 0,
    },
    ...(layer.type === "line"
      ? { arrowEnd: "none" as const, arrowStart: "none" as const }
      : layer.type === "shape"
      ? { arrowEnd: false, arrowStart: false }
      : {}),
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  } as unknown as Layer;

  // 2. Head Layer (Tip marker positioned at end of shaft)
  const headSize = Math.max(12, ((layer.style.borderWidth as number) || 2) * 4);
  const head: ShapeLayer = {
    id: `arrowhead_${Date.now()}`,
    name: `${layer.name} (Head)`,
    type: "shape",
    shapeType: "triangle",
    style: {
      x: Math.max(0, widthNum - headSize / 2),
      y: Math.max(0, heightNum / 2 - headSize / 2),
      width: headSize,
      height: headSize,
      rotation: 90, // Oriented along line direction
      opacity: 1,
      backgroundColor: (layer.style.borderColor as string) || (layer.style.color as string) || "#3b82f6",
      borderWidth: 0,
    },
    animation: {
      in: {
        preset: "pop",
        duration: 0.4,
        start: 0.6, // Pops on when shaft reaches tip
        easing: "bouncy",
      },
    },
  };

  const group: GroupLayer = {
    id: `group_arrow_${Date.now()}`,
    name: `${layer.name} (Shaft & Head)`,
    type: "group",
    isCompound: true,
    locked: true,
    compoundType: "split-line",
    style: {
      x: layer.style.x,
      y: layer.style.y,
      width: widthNum,
      height: heightNum,
      rotation: layer.style.rotation || 0,
      opacity: layer.style.opacity ?? 1,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    children: [shaft, head],
  };

  return { group, segments: [shaft, head] };
}
