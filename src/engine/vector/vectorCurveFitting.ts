/**
 * Vector Curve Fitting & Spline Math
 * Converts raw points (pencil) and control-point vertices (pen) into
 * clean, continuous C1 cubic Bezier SVG path definitions.
 */

export interface VectorPoint {
  x: number;
  y: number;
}

export interface PenVertex {
  x: number;
  y: number;
  cpIn?: VectorPoint;
  cpOut?: VectorPoint;
}

/**
 * Simplifies point stream by eliminating points closer than tolerance
 */
export function simplifyPoints(points: VectorPoint[], tolerance = 3): VectorPoint[] {
  if (points.length <= 2) return points;
  const result: VectorPoint[] = [points[0]];
  let last = points[0];
  const tolSq = tolerance * tolerance;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    const dx = pt.x - last.x;
    const dy = pt.y - last.y;
    if (dx * dx + dy * dy >= tolSq) {
      result.push(pt);
      last = pt;
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Converts a sequence of raw pointer points into a smooth SVG cubic Bezier path
 * using Catmull-Rom to Cubic Bezier conversion.
 */
export function smoothPointsToPath(rawPoints: VectorPoint[], closed = false): string {
  const points = simplifyPoints(rawPoints, 3);
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} Z`;
  if (n === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < n - 2 ? points[i + 2] : p2;

    // Catmull-Rom to Bezier control points formula
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  if (closed) {
    d += " Z";
  }

  return d;
}

/**
 * Formats authored Pen vertices (with optional control handles) into an SVG path d string
 */
export function penVerticesToPath(vertices: PenVertex[], closed = false): string {
  if (vertices.length === 0) return "";
  if (vertices.length === 1) {
    return `M ${vertices[0].x.toFixed(1)} ${vertices[0].y.toFixed(1)}`;
  }

  let d = `M ${vertices[0].x.toFixed(1)} ${vertices[0].y.toFixed(1)}`;

  for (let i = 1; i < vertices.length; i++) {
    const prev = vertices[i - 1];
    const cur = vertices[i];

    if (prev.cpOut || cur.cpIn) {
      const cp1x = prev.cpOut ? prev.cpOut.x : prev.x;
      const cp1y = prev.cpOut ? prev.cpOut.y : prev.y;
      const cp2x = cur.cpIn ? cur.cpIn.x : cur.x;
      const cp2y = cur.cpIn ? cur.cpIn.y : cur.y;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    } else {
      d += ` L ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    }
  }

  if (closed && vertices.length > 2) {
    const last = vertices[vertices.length - 1];
    const first = vertices[0];
    if (last.cpOut || first.cpIn) {
      const cp1x = last.cpOut ? last.cpOut.x : last.x;
      const cp1y = last.cpOut ? last.cpOut.y : last.y;
      const cp2x = first.cpIn ? first.cpIn.x : first.x;
      const cp2y = first.cpIn ? first.cpIn.y : first.y;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${first.x.toFixed(1)} ${first.y.toFixed(1)} Z`;
    } else {
      d += " Z";
    }
  }

  return d;
}
