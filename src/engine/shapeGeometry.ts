import { ShapeLayer } from "@/types/scene";

export interface ShapeEdge {
  id: string;
  label: string;
  d: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  midPoint: { x: number; y: number };
}

/**
 * Returns the exact geometric edges / sides of any shape layer based on its shapeType:
 * - rectangle: 4 sides (top, right, bottom, left) with exact corner arc coverage
 * - triangle: 3 sides (right slant, bottom base, left slant)
 * - polygon: N sides based on layer.sides
 * - star: 2*points sides based on layer.points and innerRadiusRatio
 * - circle/ellipse: 4 quadrant arcs
 */
export function getShapeEdges(layer: ShapeLayer): ShapeEdge[] {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 150;
  const W = widthNum;
  const H = heightNum;

  const shapeType = layer.shapeType || "rectangle";

  if (shapeType === "triangle") {
    // 3 vertices from generatePolygonPoints(3)
    const V0 = { x: 0.5 * W, y: 0.05 * H };
    const V1 = { x: (88.97 / 100) * W, y: (72.5 / 100) * H };
    const V2 = { x: (11.03 / 100) * W, y: (72.5 / 100) * H };

    return [
      {
        id: "edge-0",
        label: "Right Slant",
        d: `M ${V0.x} ${V0.y} L ${V1.x} ${V1.y}`,
        startPoint: V0,
        endPoint: V1,
        midPoint: { x: (V0.x + V1.x) / 2, y: (V0.y + V1.y) / 2 },
      },
      {
        id: "edge-1",
        label: "Bottom Base",
        d: `M ${V1.x} ${V1.y} L ${V2.x} ${V2.y}`,
        startPoint: V1,
        endPoint: V2,
        midPoint: { x: (V1.x + V2.x) / 2, y: (V1.y + V2.y) / 2 },
      },
      {
        id: "edge-2",
        label: "Left Slant",
        d: `M ${V2.x} ${V2.y} L ${V0.x} ${V0.y}`,
        startPoint: V2,
        endPoint: V0,
        midPoint: { x: (V2.x + V0.x) / 2, y: (V2.y + V0.y) / 2 },
      },
    ];
  }

  if (shapeType === "polygon") {
    const sides = layer.sides || 5;
    const cx = 50, cy = 50, r = 45;
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = ((cx + r * Math.cos(angle)) / 100) * W;
      const y = ((cy + r * Math.sin(angle)) / 100) * H;
      vertices.push({ x, y });
    }

    const edges: ShapeEdge[] = [];
    for (let i = 0; i < sides; i++) {
      const nextIdx = (i + 1) % sides;
      const vCur = vertices[i];
      const vNext = vertices[nextIdx];
      edges.push({
        id: `edge-${i}`,
        label: `Side ${i + 1}`,
        d: `M ${vCur.x} ${vCur.y} L ${vNext.x} ${vNext.y}`,
        startPoint: vCur,
        endPoint: vNext,
        midPoint: { x: (vCur.x + vNext.x) / 2, y: (vCur.y + vNext.y) / 2 },
      });
    }
    return edges;
  }

  if (shapeType === "star") {
    const points = layer.points || 5;
    const innerRatio = layer.innerRadiusRatio || 0.382;
    const totalVertices = points * 2;
    const cx = 50, cy = 50, rOuter = 45, rInner = 45 * innerRatio;
    const vertices: { x: number; y: number }[] = [];

    for (let i = 0; i < totalVertices; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = ((cx + r * Math.cos(angle)) / 100) * W;
      const y = ((cy + r * Math.sin(angle)) / 100) * H;
      vertices.push({ x, y });
    }

    const edges: ShapeEdge[] = [];
    for (let i = 0; i < totalVertices; i++) {
      const nextIdx = (i + 1) % totalVertices;
      const vCur = vertices[i];
      const vNext = vertices[nextIdx];
      edges.push({
        id: `edge-${i}`,
        label: `Segment ${i + 1}`,
        d: `M ${vCur.x} ${vCur.y} L ${vNext.x} ${vNext.y}`,
        startPoint: vCur,
        endPoint: vNext,
        midPoint: { x: (vCur.x + vNext.x) / 2, y: (vCur.y + vNext.y) / 2 },
      });
    }
    return edges;
  }

  if (shapeType === "circle" || shapeType === "ellipse") {
    const cx = W / 2;
    const cy = H / 2;
    const rx = W / 2;
    const ry = H / 2;

    return [
      {
        id: "top-right",
        label: "Top-Right Arc",
        d: `M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`,
        startPoint: { x: cx, y: cy - ry },
        endPoint: { x: cx + rx, y: cy },
        midPoint: { x: cx + rx * 0.707, y: cy - ry * 0.707 },
      },
      {
        id: "bottom-right",
        label: "Bottom-Right Arc",
        d: `M ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry}`,
        startPoint: { x: cx + rx, y: cy },
        endPoint: { x: cx, y: cy + ry },
        midPoint: { x: cx + rx * 0.707, y: cy + ry * 0.707 },
      },
      {
        id: "bottom-left",
        label: "Bottom-Left Arc",
        d: `M ${cx} ${cy + ry} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}`,
        startPoint: { x: cx, y: cy + ry },
        endPoint: { x: cx - rx, y: cy },
        midPoint: { x: cx - rx * 0.707, y: cy + ry * 0.707 },
      },
      {
        id: "top-left",
        label: "Top-Left Arc",
        d: `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx} ${cy - ry}`,
        startPoint: { x: cx - rx, y: cy },
        endPoint: { x: cx, y: cy - ry },
        midPoint: { x: cx - rx * 0.707, y: cy - ry * 0.707 },
      },
    ];
  }

  // Default: Rectangle (with corner arc continuity)
  const rawRadius = typeof layer.style.borderRadius === "number" ? layer.style.borderRadius : 0;
  const maxRadius = Math.min(W / 2, H / 2);
  const r = Math.max(0, Math.min(rawRadius, maxRadius));

  if (r === 0) {
    return [
      {
        id: "top",
        label: "Top Edge",
        d: `M 0 0 L ${W} 0`,
        startPoint: { x: 0, y: 0 },
        endPoint: { x: W, y: 0 },
        midPoint: { x: W / 2, y: 0 },
      },
      {
        id: "right",
        label: "Right Edge",
        d: `M ${W} 0 L ${W} ${H}`,
        startPoint: { x: W, y: 0 },
        endPoint: { x: W, y: H },
        midPoint: { x: W, y: H / 2 },
      },
      {
        id: "bottom",
        label: "Bottom Edge",
        d: `M ${W} ${H} L 0 ${H}`,
        startPoint: { x: W, y: H },
        endPoint: { x: 0, y: H },
        midPoint: { x: W / 2, y: H },
      },
      {
        id: "left",
        label: "Left Edge",
        d: `M 0 ${H} L 0 0`,
        startPoint: { x: 0, y: H },
        endPoint: { x: 0, y: 0 },
        midPoint: { x: 0, y: H / 2 },
      },
    ];
  }

  // Rounded rectangle: Junctions J0, J1, J2, J3 ensure each edge starts EXACTLY where the previous edge ends
  // J0 = (r, 0), J1 = (W, r), J2 = (W - r, H), J3 = (0, H - r)
  const J0 = { x: r, y: 0 };
  const J1 = { x: W, y: r };
  const J2 = { x: W - r, y: H };
  const J3 = { x: 0, y: H - r };

  return [
    {
      id: "top",
      label: "Top Edge",
      d: `M ${J0.x} ${J0.y} L ${W - r} 0 A ${r} ${r} 0 0 1 ${J1.x} ${J1.y}`,
      startPoint: J0,
      endPoint: J1,
      midPoint: { x: W / 2, y: 0 },
    },
    {
      id: "right",
      label: "Right Edge",
      d: `M ${J1.x} ${J1.y} L ${W} ${H - r} A ${r} ${r} 0 0 1 ${J2.x} ${J2.y}`,
      startPoint: J1,
      endPoint: J2,
      midPoint: { x: W, y: H / 2 },
    },
    {
      id: "bottom",
      label: "Bottom Edge",
      d: `M ${J2.x} ${J2.y} L ${r} ${H} A ${r} ${r} 0 0 1 ${J3.x} ${J3.y}`,
      startPoint: J2,
      endPoint: J3,
      midPoint: { x: W / 2, y: H },
    },
    {
      id: "left",
      label: "Left Edge",
      d: `M ${J3.x} ${J3.y} L 0 ${r} A ${r} ${r} 0 0 1 ${J0.x} ${J0.y}`,
      startPoint: J3,
      endPoint: J0,
      midPoint: { x: 0, y: H / 2 },
    },
  ];
}

/**
 * Builds an SVG path string from an array of selected edge IDs.
 * Consecutive edges are seamlessly connected without extra moveTo jumps,
 * guaranteeing 0.0000px gap and 100% perimeter continuity.
 */
export function buildPathFromEdges(allEdges: ShapeEdge[], edgeIdsToInclude: string[]): string {
  if (edgeIdsToInclude.length === 0) return "";

  const selectedSet = new Set(edgeIdsToInclude);
  const n = allEdges.length;

  // Find contiguous runs of selected edges along the perimeter
  // Check if edge n-1 and edge 0 are both selected to handle circular wrap-around
  const isSelected = allEdges.map((e) => selectedSet.has(e.id));

  // Find starting index of a run that doesn't wrap, or 0 if all are selected
  let startIdx = 0;
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    if (isSelected[i] && !isSelected[prevIdx]) {
      startIdx = i;
      break;
    }
  }

  const subpaths: string[] = [];
  let currentSubpath = "";
  let lastEndPoint: { x: number; y: number } | null = null;
  let countProcessed = 0;

  for (let step = 0; step < n; step++) {
    const idx = (startIdx + step) % n;
    if (isSelected[idx]) {
      const edge = allEdges[idx];
      if (!currentSubpath || !lastEndPoint || lastEndPoint.x !== edge.startPoint.x || lastEndPoint.y !== edge.startPoint.y) {
        if (currentSubpath) {
          subpaths.push(currentSubpath);
        }
        currentSubpath = edge.d;
      } else {
        // Strip the leading "M x y " from edge.d to append cleanly
        const commandsOnly = edge.d.replace(/^M\s+[\d.-]+\s+[\d.-]+\s*/, "");
        currentSubpath += ` ${commandsOnly}`;
      }
      lastEndPoint = edge.endPoint;
      countProcessed++;
    } else {
      if (currentSubpath) {
        subpaths.push(currentSubpath);
        currentSubpath = "";
        lastEndPoint = null;
      }
    }
  }

  if (currentSubpath) {
    subpaths.push(currentSubpath);
  }

  return subpaths.join(" ");
}
