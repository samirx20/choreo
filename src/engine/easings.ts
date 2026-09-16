import { EasingType } from "@/types/scene";

// Standard cubic-bezier solver
export function cubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): (t: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    let t2 = x;
    // Newton-Raphson iteration
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) return t2;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }

    // Fallback: Bisection search
    let t0 = 0.0;
    let t1 = 1.0;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-6) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
  }

  return function (x: number) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

// Built-in easing curves matching Jitter & modern motion design
export const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
  // Smooth / Cubic Ease-Out
  smooth: cubicBezier(0.16, 1, 0.3, 1),

  // Bouncy / Elastic Overshoot
  bouncy: (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p = 0.4;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },

  // Overshoot (anticipation and pop)
  overshoot: (t: number) => {
    const s = 1.70158;
    const tMinusOne = t - 1;
    return tMinusOne * tMinusOne * ((s + 1) * tMinusOne + s) + 1;
  },

  // Snappy / High Initial Velocity
  snappy: cubicBezier(0.2, 0.8, 0.2, 1),

  // Linear
  linear: (t: number) => Math.min(Math.max(t, 0), 1),

  // Default custom fallback
  custom: cubicBezier(0.25, 0.1, 0.25, 1),
};

export function getEasing(
  type: EasingType,
  bezierPoints?: [number, number, number, number]
): (t: number) => number {
  if (type === "custom" && bezierPoints && bezierPoints.length === 4) {
    return cubicBezier(
      bezierPoints[0],
      bezierPoints[1],
      bezierPoints[2],
      bezierPoints[3]
    );
  }
  return EASING_FUNCTIONS[type] || EASING_FUNCTIONS.smooth;
}
