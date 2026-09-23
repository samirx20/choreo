import { ShapeLayer, GroupLayer, Layer } from "@/types/scene";

export interface SplitShapeResult {
  group: GroupLayer;
  subLayers: ShapeLayer[];
}

/**
 * Decomposes a rounded rectangle into two continuous open SVG bezier path segments:
 * - Path A (West & South): Starts at NW (R, 0), curves through Top-Left arc, runs down Left edge,
 *   curves through Bottom-Left arc, and runs along Bottom edge to SE (W - R, H).
 * - Path B (East & North): Starts at SE (W - R, H), curves through Bottom-Right arc, runs up Right edge,
 *   curves through Top-Right arc, and runs along Top edge to NW (R, 0).
 *
 * Both paths preserve the authored corner radii (borderRadius), strokeWidth, and styling.
 * When rendered simultaneously, they form the exact rounded rectangle with 0.0000px visual shift,
 * allowing dual-origin draw path animations starting at NW and SE simultaneously.
 */
export function splitRoundedRectContour(
  layer: ShapeLayer,
  options: {
    startA?: "nw" | "se";
    startB?: "se" | "nw";
  } = {}
): SplitShapeResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 150;
  
  const rawRadius = typeof layer.style.borderRadius === "number" ? layer.style.borderRadius : 0;
  const maxRadius = Math.min(widthNum / 2, heightNum / 2);
  const r = Math.max(0, Math.min(rawRadius, maxRadius));

  const strokeWidth =
    typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0
      ? layer.style.borderWidth
      : 2;
  const strokeColor =
    layer.style.borderColor || layer.style.backgroundColor || "#3b82f6";

  // Coordinates of key transition points:
  // NW corner arc: (r, 0) <-> (0, r)
  // SW corner arc: (0, H - r) <-> (r, H)
  // SE corner arc: (W - r, H) <-> (W, H - r)
  // NE corner arc: (W, r) <-> (W - r, 0)
  const W = widthNum;
  const H = heightNum;

  // Path A: NW -> SW -> SE (West and South)
  // Starts at top-left edge (r, 0), sweeps counter-clockwise to (0, r), runs down to (0, H - r),
  // sweeps to (r, H), and runs along bottom to (W - r, H).
  const pathA_d = r > 0
    ? `M ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${H - r} A ${r} ${r} 0 0 0 ${r} ${H} L ${W - r} ${H}`
    : `M 0 0 L 0 ${H} L ${W} ${H}`;

  // Path B: SE -> NE -> NW (East and North)
  // Starts at bottom-right edge (W - r, H), sweeps counter-clockwise to (W, H - r), runs up to (W, r),
  // sweeps to (W - r, 0), and runs along top to (r, 0).
  const pathB_d = r > 0
    ? `M ${W - r} ${H} A ${r} ${r} 0 0 0 ${W} ${H - r} L ${W} ${r} A ${r} ${r} 0 0 0 ${W - r} 0 L ${r} 0`
    : `M ${W} ${H} L ${W} 0 L 0 0`;

  // Calculated perimeter for each half:
  // Quarter circle arc length = (pi * r) / 2
  // Path A length = (W - 2r) + (H - 2r) + pi * r
  const halfPerimeter = Math.round(((W - 2 * r) + (H - 2 * r) + Math.PI * r) * 100) / 100;

  const baseStyle = {
    ...layer.style,
    backgroundColor: "transparent",
    borderWidth: strokeWidth,
    borderColor: strokeColor,
    borderRadius: 0, // Individual bezier paths carry the corner arcs inside 'd'
  };

  const pathA: ShapeLayer = {
    id: `path_${Date.now()}_nw`,
    name: `${layer.name} (West & South)`,
    type: "shape",
    shapeType: "path",
    d: pathA_d,
    pathPerimeter: halfPerimeter,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: {
      ...baseStyle,
      x: 0,
      y: 0,
    },
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  };

  const pathB: ShapeLayer = {
    id: `path_${Date.now()}_se`,
    name: `${layer.name} (East & North)`,
    type: "shape",
    shapeType: "path",
    d: pathB_d,
    pathPerimeter: halfPerimeter,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: {
      ...baseStyle,
      x: 0,
      y: 0,
    },
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  };

  const group: GroupLayer = {
    id: `group_split_${Date.now()}`,
    name: `${layer.name} (Dual Path)`,
    type: "group",
    isCompound: true,
    compoundType: "split-shape",
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
    children: [pathA, pathB],
  };

  return { group, subLayers: [pathA, pathB] };
}

/**
 * Decomposes a circle into two half-arc paths (Left semi-circle and Right semi-circle).
 * Both start at North (top center) and South (bottom center) to draw simultaneously.
 */
export function splitCircleContour(layer: ShapeLayer): SplitShapeResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 100;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 100;
  const rx = widthNum / 2;
  const ry = heightNum / 2;

  const strokeWidth =
    typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0
      ? layer.style.borderWidth
      : 2;
  const strokeColor =
    layer.style.borderColor || layer.style.backgroundColor || "#3b82f6";

  // Semi-circle Left: from Top (rx, 0) to Bottom (rx, 2*ry) via West
  const pathLeft_d = `M ${rx} 0 A ${rx} ${ry} 0 0 0 ${rx} ${2 * ry}`;
  // Semi-circle Right: from Bottom (rx, 2*ry) to Top (rx, 0) via East
  const pathRight_d = `M ${rx} ${2 * ry} A ${rx} ${ry} 0 0 0 ${rx} 0`;

  // Ramanujan approximation for ellipse perimeter / 2
  const semiPerimeter = Math.round(Math.PI * Math.sqrt(0.5 * (rx * rx + ry * ry)) * 100) / 100;

  const baseStyle = {
    ...layer.style,
    backgroundColor: "transparent",
    borderWidth: strokeWidth,
    borderColor: strokeColor,
    borderRadius: 0,
  };

  const pathA: ShapeLayer = {
    id: `path_circ_${Date.now()}_left`,
    name: `${layer.name} (Left Arc)`,
    type: "shape",
    shapeType: "path",
    d: pathLeft_d,
    pathPerimeter: semiPerimeter,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: { ...baseStyle, x: 0, y: 0 },
    animation: {
      in: { preset: "drawOn", duration: 0.8, start: 0, easing: "snappy" },
    },
  };

  const pathB: ShapeLayer = {
    id: `path_circ_${Date.now()}_right`,
    name: `${layer.name} (Right Arc)`,
    type: "shape",
    shapeType: "path",
    d: pathRight_d,
    pathPerimeter: semiPerimeter,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: { ...baseStyle, x: 0, y: 0 },
    animation: {
      in: { preset: "drawOn", duration: 0.8, start: 0, easing: "snappy" },
    },
  };

  const group: GroupLayer = {
    id: `group_circ_${Date.now()}`,
    name: `${layer.name} (Split Arcs)`,
    type: "group",
    isCompound: true,
    compoundType: "split-shape",
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
    children: [pathA, pathB],
  };

  return { group, subLayers: [pathA, pathB] };
}

/**
 * Separates any shape's Fill and Stroke into two independent sibling layers:
 * 1. Fill Layer: retains authored fill color, corner radii, and drop shadows (borderWidth: 0).
 * 2. Stroke Layer: retains authored stroke width, color, cap, join, and trim paths (backgroundColor: 'transparent').
 *
 * Allows choreographing stroke draw-on first, followed by a soft fill fade/iris reveal.
 */
export function separateStrokeAndFill(layer: ShapeLayer): SplitShapeResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 150;

  // 1. Fill Layer
  const fillLayer: ShapeLayer = {
    ...layer,
    id: `fill_${Date.now()}`,
    name: `${layer.name} (Fill)`,
    style: {
      ...layer.style,
      x: 0,
      y: 0,
      borderWidth: 0,
      borderColor: "transparent",
    },
    animation: {
      in: {
        preset: "fade",
        duration: 0.6,
        start: 0.4, // Staggers after stroke begins
        easing: "smooth",
      },
    },
  };

  // 2. Stroke Layer
  const strokeLayer: ShapeLayer = {
    ...layer,
    id: `stroke_${Date.now()}`,
    name: `${layer.name} (Stroke)`,
    style: {
      ...layer.style,
      x: 0,
      y: 0,
      backgroundColor: "transparent",
      fillColor: "transparent",
      shadows: [], // Shadows reside on the fill layer
    },
    trimStart: 0,
    trimEnd: 100,
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  };

  const group: GroupLayer = {
    id: `group_separated_${Date.now()}`,
    name: `${layer.name} (Fill & Stroke)`,
    type: "group",
    isCompound: true,
    compoundType: "split-shape",
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
    children: [fillLayer, strokeLayer],
  };

  return { group, subLayers: [fillLayer, strokeLayer] };
}

/**
 * Splits a shape's perimeter into two independent SVG path layers based on interactively selected edges.
 * Part 1: The selected edges (with corner radii arcs).
 * Part 2: The remaining edges (with corner radii arcs).
 * Both parts are packaged in a compound locked group (moves as one, animates separately).
 */
export function splitShapeByEdges(
  layer: ShapeLayer,
  selectedEdges: ("top" | "right" | "bottom" | "left")[]
): SplitShapeResult {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 150;

  const rawRadius = typeof layer.style.borderRadius === "number" ? layer.style.borderRadius : 0;
  const maxRadius = Math.min(widthNum / 2, heightNum / 2);
  const r = Math.max(0, Math.min(rawRadius, maxRadius));

  const strokeWidth =
    typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0
      ? layer.style.borderWidth
      : 2;
  const strokeColor =
    layer.style.borderColor || layer.style.backgroundColor || "#3b82f6";

  const W = widthNum;
  const H = heightNum;

  function buildPathD(edges: ("top" | "right" | "bottom" | "left")[]): string {
    const hasTop = edges.includes("top");
    const hasRight = edges.includes("right");
    const hasBottom = edges.includes("bottom");
    const hasLeft = edges.includes("left");

    if (hasTop && hasLeft && !hasRight && !hasBottom) {
      return r > 0
        ? `M 0 ${H - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${W - r} 0`
        : `M 0 ${H} L 0 0 L ${W} 0`;
    }
    if (hasRight && hasBottom && !hasTop && !hasLeft) {
      return r > 0
        ? `M ${W} ${r} L ${W} ${H - r} A ${r} ${r} 0 0 1 ${W - r} ${H} L ${r} ${H}`
        : `M ${W} 0 L ${W} ${H} L 0 ${H}`;
    }
    if (hasTop && hasRight && !hasBottom && !hasLeft) {
      return r > 0
        ? `M ${r} 0 L ${W - r} 0 A ${r} ${r} 0 0 1 ${W} ${r} L ${W} ${H - r}`
        : `M 0 0 L ${W} 0 L ${W} ${H}`;
    }
    if (hasBottom && hasLeft && !hasTop && !hasRight) {
      return r > 0
        ? `M ${W - r} ${H} L ${r} ${H} A ${r} ${r} 0 0 1 0 ${H - r} L 0 ${r}`
        : `M ${W} ${H} L 0 ${H} L 0 0`;
    }

    const pathParts: string[] = [];
    if (hasTop) {
      pathParts.push(r > 0 ? `M ${r} 0 L ${W - r} 0` : `M 0 0 L ${W} 0`);
      if (hasRight && r > 0) pathParts.push(`A ${r} ${r} 0 0 1 ${W} ${r}`);
    }
    if (hasRight) {
      if (!hasTop || r === 0) pathParts.push(r > 0 ? `M ${W} ${r} L ${W} ${H - r}` : `M ${W} 0 L ${W} ${H}`);
      else pathParts.push(`L ${W} ${H - r}`);
      if (hasBottom && r > 0) pathParts.push(`A ${r} ${r} 0 0 1 ${W - r} ${H}`);
    }
    if (hasBottom) {
      if (!hasRight || r === 0) pathParts.push(r > 0 ? `M ${W - r} ${H} L ${r} ${H}` : `M ${W} ${H} L 0 ${H}`);
      else pathParts.push(`L ${r} ${H}`);
      if (hasLeft && r > 0) pathParts.push(`A ${r} ${r} 0 0 1 0 ${H - r}`);
    }
    if (hasLeft) {
      if (!hasBottom || r === 0) pathParts.push(r > 0 ? `M 0 ${H - r} L 0 ${r}` : `M 0 ${H} L 0 0`);
      else pathParts.push(`L 0 ${r}`);
      if (hasTop && r > 0) pathParts.push(`A ${r} ${r} 0 0 1 ${r} 0`);
    }

    return pathParts.join(" ") || `M 0 0 L 0 0`;
  }

  const allEdges: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
  const unselectedEdges = allEdges.filter((e) => !selectedEdges.includes(e));

  const pathA_d = buildPathD(selectedEdges);
  const pathB_d = buildPathD(unselectedEdges);

  const baseStyle = {
    ...layer.style,
    backgroundColor: "transparent",
    borderWidth: strokeWidth,
    borderColor: strokeColor,
    borderRadius: 0,
  };

  const pathA: ShapeLayer = {
    id: `path_${Date.now()}_sel`,
    name: `${layer.name} (Selected Edges)`,
    type: "shape",
    shapeType: "path",
    d: pathA_d,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: {
      ...baseStyle,
      x: 0,
      y: 0,
    },
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  };

  const pathB: ShapeLayer = {
    id: `path_${Date.now()}_rem`,
    name: `${layer.name} (Remaining Edges)`,
    type: "shape",
    shapeType: "path",
    d: pathB_d,
    strokeCap: layer.strokeCap || "round",
    strokeJoin: layer.strokeJoin || "round",
    trimStart: 0,
    trimEnd: 100,
    style: {
      ...baseStyle,
      x: 0,
      y: 0,
    },
    animation: {
      in: {
        preset: "drawOn",
        duration: 0.8,
        start: 0,
        easing: "snappy",
      },
    },
  };

  const group: GroupLayer = {
    id: `compound_shape_${Date.now()}`,
    name: `${layer.name} (Split)`,
    type: "group",
    isCompound: true,
    compoundType: "split-shape",
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
    children: [pathA, pathB],
  };

  return { group, subLayers: [pathA, pathB] };
}
