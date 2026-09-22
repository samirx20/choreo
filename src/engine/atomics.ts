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

// Mask / Clip Inset
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
