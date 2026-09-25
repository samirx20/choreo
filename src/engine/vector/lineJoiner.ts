/**
 * Line Joiner & Vertex Fillet Solver
 * 
 * Chains multiple connected lines into a unified closed polygon shape and applies
 * continuous C1 quadratic Bezier fillets with independent per-vertex corner radii.
 */

export interface PolygonVertex {
  x: number;
  y: number;
  radius?: number;
}

export interface LineSegment {
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Extracts line endpoints in canvas space from a layer
 */
export function getLineEndpoints(layer: any): LineSegment {
  if (
    layer.style === undefined &&
    layer.x1 !== undefined &&
    layer.y1 !== undefined &&
    layer.x2 !== undefined &&
    layer.y2 !== undefined
  ) {
    return {
      id: layer.id,
      x1: layer.x1,
      y1: layer.y1,
      x2: layer.x2,
      y2: layer.y2,
    };
  }

  const s = layer.style || {};
  const x = s.x || 0;
  const y = s.y || 0;
  const w = typeof s.width === "number" ? s.width : 100;
  const h = typeof s.height === "number" ? s.height : 2;
  const rot = ((s.rotation || 0) * Math.PI) / 180;
  const pivotX = s.pivotX !== undefined ? s.pivotX : 0;
  const pivotY = s.pivotY !== undefined ? s.pivotY : 0.5;
  const cx = x + w * pivotX;
  const cy = y + h * pivotY;

  const lx1 = x;
  const ly1 = y + h / 2;
  const lx2 = x + w;
  const ly2 = y + h / 2;

  if (rot === 0) {
    return { id: layer.id, x1: lx1, y1: ly1, x2: lx2, y2: ly2 };
  }

  const rx1 = cx + (lx1 - cx) * Math.cos(rot) - (ly1 - cy) * Math.sin(rot);
  const ry1 = cy + (lx1 - cx) * Math.sin(rot) + (ly1 - cy) * Math.cos(rot);
  const rx2 = cx + (lx2 - cx) * Math.cos(rot) - (ly2 - cy) * Math.sin(rot);
  const ry2 = cy + (lx2 - cx) * Math.sin(rot) + (ly2 - cy) * Math.cos(rot);

  return {
    id: layer.id,
    x1: Math.round(rx1 * 100) / 100,
    y1: Math.round(ry1 * 100) / 100,
    x2: Math.round(rx2 * 100) / 100,
    y2: Math.round(ry2 * 100) / 100,
  };
}

/**
 * Chains multiple line segments head-to-tail by endpoint proximity.
 * Handles reverse segment orientations and checks for closure.
 */
export function chainLineSegments(
  segments: LineSegment[],
  snapTolerance = 30
): { vertices: PolygonVertex[]; closed: boolean } {
  if (segments.length === 0) {
    return { vertices: [], closed: false };
  }
  if (segments.length === 1) {
    const s = segments[0];
    return {
      vertices: [
        { x: s.x1, y: s.y1, radius: 0 },
        { x: s.x2, y: s.y2, radius: 0 },
      ],
      closed: false,
    };
  }

  const distSq = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  };

  const pool = [...segments];
  const first = pool.shift()!;
  const orderedPoints: { x: number; y: number }[] = [
    { x: first.x1, y: first.y1 },
    { x: first.x2, y: first.y2 },
  ];

  const tolSq = snapTolerance * snapTolerance;

  while (pool.length > 0) {
    const tail = orderedPoints[orderedPoints.length - 1];
    let bestIdx = -1;
    let bestDist = Infinity;
    let flip = false;

    for (let i = 0; i < pool.length; i++) {
      const seg = pool[i];
      const dStart = distSq(tail.x, tail.y, seg.x1, seg.y1);
      const dEnd = distSq(tail.x, tail.y, seg.x2, seg.y2);

      if (dStart < bestDist) {
        bestDist = dStart;
        bestIdx = i;
        flip = false;
      }
      if (dEnd < bestDist) {
        bestDist = dEnd;
        bestIdx = i;
        flip = true;
      }
    }

    if (bestIdx !== -1) {
      const chosen = pool.splice(bestIdx, 1)[0];
      if (flip) {
        orderedPoints.push({ x: chosen.x1, y: chosen.y1 });
      } else {
        orderedPoints.push({ x: chosen.x2, y: chosen.y2 });
      }
    } else {
      break;
    }
  }

  // Check if closed (last point meets first point within tolerance)
  const head = orderedPoints[0];
  const tail = orderedPoints[orderedPoints.length - 1];
  const isClosed = distSq(head.x, head.y, tail.x, tail.y) <= tolSq;

  let finalPoints = orderedPoints;
  if (isClosed && orderedPoints.length > 2) {
    // Drop the redundant closing tail point since it loops to head
    finalPoints = orderedPoints.slice(0, -1);
  }

  const vertices: PolygonVertex[] = finalPoints.map((pt) => ({
    x: Math.round(pt.x * 100) / 100,
    y: Math.round(pt.y * 100) / 100,
    radius: 0,
  }));

  return { vertices, closed: isClosed || orderedPoints.length >= 3 };
}

/**
 * Builds an SVG path string from ordered vertices with independent per-vertex corner radii.
 * Uses continuous quadratic Bezier tangent fillets (Q) with edge-length clamping.
 */
export function buildFilletPath(
  vertices: PolygonVertex[],
  closed = true
): {
  d: string;
  pathPerimeter: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
} {
  const n = vertices.length;
  if (n === 0) {
    return {
      d: "",
      pathPerimeter: 0,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  // Calculate raw vertex bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  if (n === 1) {
    return {
      d: `M ${vertices[0].x} ${vertices[0].y} Z`,
      pathPerimeter: 0,
      bounds: { minX, minY, maxX, maxY, width, height },
    };
  }

  if (n === 2 || !closed) {
    let d = `M ${vertices[0].x} ${vertices[0].y}`;
    let perim = 0;
    for (let i = 1; i < n; i++) {
      d += ` L ${vertices[i].x} ${vertices[i].y}`;
      const dx = vertices[i].x - vertices[i - 1].x;
      const dy = vertices[i].y - vertices[i - 1].y;
      perim += Math.hypot(dx, dy);
    }
    if (closed) d += " Z";
    return {
      d,
      pathPerimeter: Math.round(perim * 100) / 100,
      bounds: { minX, minY, maxX, maxY, width, height },
    };
  }

  // 1. Calculate requested tangent trims for each vertex
  const trimsOut = new Array(n).fill(0);
  const trimsIn = new Array(n).fill(0);
  const uVecs = new Array(n);
  const wVecs = new Array(n);
  const edgeLengths = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const cur = vertices[i];
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];

    const ux = prev.x - cur.x;
    const uy = prev.y - cur.y;
    const uLen = Math.hypot(ux, uy);

    const wx = next.x - cur.x;
    const wy = next.y - cur.y;
    const wLen = Math.hypot(wx, wy);

    edgeLengths[i] = wLen; // Length of edge from vertex i to vertex i+1

    if (uLen === 0 || wLen === 0) {
      uVecs[i] = { x: 0, y: 0, len: 0 };
      wVecs[i] = { x: 0, y: 0, len: 0 };
      continue;
    }

    const uHat = { x: ux / uLen, y: uy / uLen, len: uLen };
    const wHat = { x: wx / wLen, y: wy / wLen, len: wLen };
    uVecs[i] = uHat;
    wVecs[i] = wHat;

    const r = Math.max(0, cur.radius ?? 0);
    if (r <= 0) {
      trimsIn[i] = 0;
      trimsOut[i] = 0;
      continue;
    }

    // Dot product to compute interior angle
    const dot = Math.max(-0.9999, Math.min(0.9999, uHat.x * wHat.x + uHat.y * wHat.y));
    const angle = Math.acos(dot);
    const halfAngle = angle / 2;

    // Tangent trim distance from vertex along both edges
    const tanVal = Math.tan(halfAngle);
    if (tanVal < 0.001) {
      trimsIn[i] = 0;
      trimsOut[i] = 0;
    } else {
      const trimDist = r / tanVal;
      trimsIn[i] = trimDist;
      trimsOut[i] = trimDist;
    }
  }

  // 2. Smart Edge Clamping (fillets on same edge must not exceed edge length)
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const edgeLen = edgeLengths[i];
    const tOut = trimsOut[i];
    const tIn = trimsIn[nextIdx];

    if (edgeLen > 0 && tOut + tIn > edgeLen) {
      const scale = edgeLen / (tOut + tIn);
      trimsOut[i] = tOut * scale;
      trimsIn[nextIdx] = tIn * scale;
    }
  }

  // 3. Construct the SVG Path with quadratic Bezier fillets
  let d = "";
  let approxPerim = 0;

  // Find start point: exiting fillet of vertex 0
  const v0 = vertices[0];
  const t0Out = trimsOut[0];
  const startX = v0.x + wVecs[0].x * t0Out;
  const startY = v0.y + wVecs[0].y * t0Out;

  d += `M ${startX.toFixed(2)} ${startY.toFixed(2)}`;

  for (let i = 1; i <= n; i++) {
    const curIdx = i % n;
    const cur = vertices[curIdx];
    const tIn = trimsIn[curIdx];
    const tOut = trimsOut[curIdx];

    const pInX = cur.x + uVecs[curIdx].x * tIn;
    const pInY = cur.y + uVecs[curIdx].y * tIn;

    const pOutX = cur.x + wVecs[curIdx].x * tOut;
    const pOutY = cur.y + wVecs[curIdx].y * tOut;

    // Fillet curve around the vertex
    if (tIn > 0.01 && tOut > 0.01) {
      d += ` L ${pInX.toFixed(2)} ${pInY.toFixed(2)}`;
      d += ` Q ${cur.x.toFixed(2)} ${cur.y.toFixed(2)} ${pOutX.toFixed(2)} ${pOutY.toFixed(2)}`;
      approxPerim += Math.hypot(pOutX - pInX, pOutY - pInY);
    } else {
      d += ` L ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
    }
  }

  d += " Z";

  for (let i = 0; i < n; i++) {
    approxPerim += edgeLengths[i];
  }

  return {
    d,
    pathPerimeter: Math.round(approxPerim * 100) / 100,
    bounds: { minX, minY, maxX, maxY, width, height },
  };
}

/**
 * Normalizes vertices and path d into local bounding box coordinates (0 to width, 0 to height)
 */
export function normalizeVerticesAndPath(
  canvasVertices: PolygonVertex[],
  closed = true
): {
  localVertices: PolygonVertex[];
  d: string;
  bounds: { x: number; y: number; width: number; height: number };
} {
  const result = buildFilletPath(canvasVertices, closed);
  const minX = result.bounds.minX;
  const minY = result.bounds.minY;

  const localVertices: PolygonVertex[] = canvasVertices.map((v) => ({
    x: Math.round((v.x - minX) * 100) / 100,
    y: Math.round((v.y - minY) * 100) / 100,
    radius: v.radius ?? 0,
  }));

  const localPath = buildFilletPath(localVertices, closed);

  return {
    localVertices,
    d: localPath.d,
    bounds: {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(1, Math.round(result.bounds.width)),
      height: Math.max(1, Math.round(result.bounds.height)),
    },
  };
}
