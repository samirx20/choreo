export interface TransformState {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  rotate: number; // 2D rotation degrees
  rotateX: number; // 3D tilt degrees
  rotateY: number; // 3D tilt degrees
  perspective: number;
}

export function defaultTransformState(): TransformState {
  return {
    x: 0,
    y: 0,
    z: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    perspective: 0,
  };
}

export function compileTransform(state: TransformState): string {
  const parts: string[] = [];
  if (state.perspective > 0) {
    parts.push(`perspective(${state.perspective}px)`);
  }
  if (state.x !== 0 || state.y !== 0 || state.z !== 0) {
    parts.push(`translate3d(${state.x}px, ${state.y}px, ${state.z}px)`);
  }
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    parts.push(`scale(${state.scaleX}, ${state.scaleY})`);
  }
  if (state.rotate !== 0) {
    parts.push(`rotate(${state.rotate}deg)`);
  }
  if (state.rotateX !== 0) {
    parts.push(`rotateX(${state.rotateX}deg)`);
  }
  if (state.rotateY !== 0) {
    parts.push(`rotateY(${state.rotateY}deg)`);
  }

  return parts.join(" ");
}

// 1. Move
function evalMove(
  progress: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number } {
  return {
    x: startX + (endX - startX) * progress,
    y: startY + (endY - startY) * progress,
  };
}

// 2. Scale
function evalScale(
  progress: number,
  startScale: number,
  endScale: number
): number {
  return startScale + (endScale - startScale) * progress;
}

// 3. Rotate
function evalRotate(
  progress: number,
  startAngle: number,
  endAngle: number
): number {
  return startAngle + (endAngle - startAngle) * progress;
}

// 4. Opacity
function evalOpacity(
  progress: number,
  startOpacity: number,
  endOpacity: number
): number {
  return Math.min(Math.max(startOpacity + (endOpacity - startOpacity) * progress, 0), 1);
}

// 5. Blur
function evalBlur(
  progress: number,
  startBlur: number,
  endBlur: number
): number {
  return Math.max(startBlur + (endBlur - startBlur) * progress, 0);
}

// 6. Color / Hex Lerp
function hexToRgba(hex: string): [number, number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((ch) => ch + ch).join("");
  }
  const num = parseInt(c, 16);
  if (c.length === 8) {
    return [
      (num >> 24) & 255,
      (num >> 16) & 255,
      (num >> 8) & 255,
      ((num & 255) / 255),
    ];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1];
}

function evalColor(
  progress: number,
  startColor: string,
  endColor: string
): string {
  try {
    const [r1, g1, b1, a1] = hexToRgba(startColor);
    const [r2, g2, b2, a2] = hexToRgba(endColor);
    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);
    const a = (a1 + (a2 - a1) * progress).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch {
    return progress > 0.5 ? endColor : startColor;
  }
}

// 7. Shadow
function evalShadow(
  progress: number,
  startBlur: number,
  endBlur: number,
  startY: number,
  endY: number,
  color = "rgba(0,0,0,0.5)"
): string {
  const b = startBlur + (endBlur - startBlur) * progress;
  const y = startY + (endY - startY) * progress;
  return `0px ${y.toFixed(1)}px ${b.toFixed(1)}px ${color}`;
}

// 8. Mask / Clip Inset
export function evalMaskInset(
  progress: number,
  direction: "up" | "down" | "left" | "right" = "up"
): string {
  // progress goes 0 (fully masked) -> 1 (fully revealed)
  const p = Math.min(Math.max(progress, 0), 1);
  const hiddenPercent = (1 - p) * 100;

  switch (direction) {
    case "up":
      // reveals from bottom to top
      return `inset(0% 0% ${hiddenPercent}% 0%)`;
    case "down":
      return `inset(${hiddenPercent}% 0% 0% 0%)`;
    case "left":
      return `inset(0% 0% 0% ${hiddenPercent}%)`;
    case "right":
      return `inset(0% ${hiddenPercent}% 0% 0%)`;
    default:
      return "inset(0% 0% 0% 0%)";
  }
}
