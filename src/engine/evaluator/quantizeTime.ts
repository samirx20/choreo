/**
 * Mathematical stepped time quantizer for stop-motion, anime on twos, and collage art styles.
 * Formula: t_stepped = floor(t * stepFps) / stepFps
 */
export function quantizeTime(t: number, stepFps?: "smooth" | number): number {
  if (!stepFps || stepFps === "smooth" || typeof stepFps !== "number" || stepFps <= 0) {
    return t;
  }
  return Math.floor(t * stepFps) / stepFps;
}
