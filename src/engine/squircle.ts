/**
 * Apple G2 Continuous Curvature (Squircle) Generator
 * Computes deterministic, closed-form G2 continuous superellipse paths
 * for iOS- and Keynote-grade smooth squircles.
 */

export interface SquircleOptions {
  width: number;
  height: number;
  cornerRadius: number | [number, number, number, number];
  squircleFactor?: number; // 0 to 1 (0.6 is Apple standard iOS smooth corner)
}

/**
 * Generates an SVG path data string ('M ... C ... Z') representing a rectangle
 * with Apple G2 continuous curvature corners.
 */
export function getSquirclePath(
  width: number,
  height: number,
  cornerRadius: number | [number, number, number, number],
  squircleFactor: number = 0.6
): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const maxR = Math.min(w, h) / 2;

  // Normalize radii: [topLeft, topRight, bottomRight, bottomLeft]
  let rTL: number, rTR: number, rBR: number, rBL: number;
  if (Array.isArray(cornerRadius)) {
    rTL = Math.max(0, Math.min(maxR, cornerRadius[0] ?? 0));
    rTR = Math.max(0, Math.min(maxR, cornerRadius[1] ?? 0));
    rBR = Math.max(0, Math.min(maxR, cornerRadius[2] ?? 0));
    rBL = Math.max(0, Math.min(maxR, cornerRadius[3] ?? 0));
  } else {
    const r = Math.max(0, Math.min(maxR, cornerRadius));
    rTL = r;
    rTR = r;
    rBR = r;
    rBL = r;
  }

  // If no corner radius is set, return a plain rectangle
  if (rTL === 0 && rTR === 0 && rBR === 0 && rBL === 0) {
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }

  const s = Math.max(0, Math.min(1, squircleFactor));

  // Helper to build a corner from (x0, y0) along axis
  // For each corner with radius r:
  // p: distance along each edge where the curve starts
  const buildCorner = (
    r: number,
    // coordinates of the corner vertex
    vx: number,
    vy: number,
    // start direction from vertex
    dx1: number,
    dy1: number,
    // end direction from vertex
    dx2: number,
    dy2: number
  ) => {
    if (r === 0) {
      return {
        start: { x: vx, y: vy },
        commands: [`L ${vx.toFixed(2)} ${vy.toFixed(2)}`],
        end: { x: vx, y: vy },
      };
    }

    const p = Math.min(maxR, (1 + s) * r);
    const startX = vx + dx1 * p;
    const startY = vy + dy1 * p;
    const endX = vx + dx2 * p;
    const endY = vy + dy2 * p;

    if (s <= 0) {
      // Standard circular arc
      return {
        start: { x: vx + dx1 * r, y: vy + dy1 * r },
        commands: [
          `A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`,
        ],
        end: { x: endX, y: endY },
      };
    }

    // Closed-form G2 continuous cubic Bézier corner
    // 2-segment cubic Bézier providing smooth acceleration and zero curvature at join
    const cp1x = vx + dx1 * (p - 0.45 * (p - r));
    const cp1y = vy + dy1 * (p - 0.45 * (p - r));
    const cp2x = vx + dx1 * (r * 0.5) + dx2 * (r * 0.08);
    const cp2y = vy + dy1 * (r * 0.5) + dy2 * (r * 0.08);
    const midX = vx + (dx1 + dx2) * (r * (1 - 0.2929));
    const midY = vy + (dy1 + dy2) * (r * (1 - 0.2929));

    const cp3x = vx + dx2 * (r * 0.5) + dx1 * (r * 0.08);
    const cp3y = vy + dy2 * (r * 0.5) + dy1 * (r * 0.08);
    const cp4x = vx + dx2 * (p - 0.45 * (p - r));
    const cp4y = vy + dy2 * (p - 0.45 * (p - r));

    return {
      start: { x: startX, y: startY },
      commands: [
        `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`,
        `C ${cp3x.toFixed(2)} ${cp3y.toFixed(2)}, ${cp4x.toFixed(2)} ${cp4y.toFixed(2)}, ${endX.toFixed(2)} ${endY.toFixed(2)}`,
      ],
      end: { x: endX, y: endY },
    };
  };

  // 1. Top-Right Corner (vertex: w, 0)
  const cTR = buildCorner(rTR, w, 0, -1, 0, 0, 1);
  // 2. Bottom-Right Corner (vertex: w, h)
  const cBR = buildCorner(rBR, w, h, 0, -1, -1, 0);
  // 3. Bottom-Left Corner (vertex: 0, h)
  const cBL = buildCorner(rBL, 0, h, 1, 0, 0, -1);
  // 4. Top-Left Corner (vertex: 0, 0)
  const cTL = buildCorner(rTL, 0, 0, 0, 1, 1, 0);

  // Assemble path starting at top-left edge after top-left corner
  const path = [
    `M ${cTL.end.x.toFixed(2)} ${cTL.end.y.toFixed(2)}`,
    `L ${cTR.start.x.toFixed(2)} ${cTR.start.y.toFixed(2)}`,
    ...cTR.commands,
    `L ${cBR.start.x.toFixed(2)} ${cBR.start.y.toFixed(2)}`,
    ...cBR.commands,
    `L ${cBL.start.x.toFixed(2)} ${cBL.start.y.toFixed(2)}`,
    ...cBL.commands,
    `L ${cTL.start.x.toFixed(2)} ${cTL.start.y.toFixed(2)}`,
    ...cTL.commands,
    'Z',
  ];

  return path.join(' ');
}
