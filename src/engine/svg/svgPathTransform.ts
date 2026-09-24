/**
 * SVG Path Transformation Engine
 * Translates, scales, and normalizes SVG path d strings with mathematical precision.
 * Works across all SVG path commands (M, L, H, V, C, S, Q, T, A, Z).
 */

export interface PathTransformOptions {
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
}

export function transformPath(d: string, options: PathTransformOptions): string {
  if (!d || typeof d !== "string") return "";

  const dx = options.dx ?? 0;
  const dy = options.dy ?? 0;
  const sx = options.sx ?? 1;
  const sy = options.sy ?? 1;

  if (dx === 0 && dy === 0 && sx === 1 && sy === 1) {
    return d;
  }

  let curX = 0;
  let curY = 0;
  let result = "";

  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    const nums = argsStr
      .match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
      ?.map(Number) ?? [];

    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    switch (type) {
      case "M":
      case "L": {
        const outCmd = type; // output normalized absolute
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i += 2) {
          const rawX = isRel ? curX + nums[i] : nums[i];
          const rawY = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const newX = rawX * sx + dx;
          const newY = rawY * sy + dy;
          parts.push(`${newX.toFixed(2)} ${newY.toFixed(2)}`);
          curX = rawX;
          curY = rawY;
        }
        result += ` ${outCmd} ${parts.join(" ")}`;
        break;
      }
      case "H": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i++) {
          const rawX = isRel ? curX + nums[i] : nums[i];
          const newX = rawX * sx + dx;
          parts.push(`${newX.toFixed(2)}`);
          curX = rawX;
        }
        result += ` H ${parts.join(" ")}`;
        break;
      }
      case "V": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i++) {
          const rawY = isRel ? curY + nums[i] : nums[i];
          const newY = rawY * sy + dy;
          parts.push(`${newY.toFixed(2)}`);
          curY = rawY;
        }
        result += ` V ${parts.join(" ")}`;
        break;
      }
      case "C": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i += 6) {
          const rawX1 = isRel ? curX + nums[i] : nums[i];
          const rawY1 = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const rawX2 = isRel ? curX + (nums[i + 2] ?? 0) : (nums[i + 2] ?? 0);
          const rawY2 = isRel ? curY + (nums[i + 3] ?? 0) : (nums[i + 3] ?? 0);
          const rawX = isRel ? curX + (nums[i + 4] ?? 0) : (nums[i + 4] ?? 0);
          const rawY = isRel ? curY + (nums[i + 5] ?? 0) : (nums[i + 5] ?? 0);

          const newX1 = rawX1 * sx + dx;
          const newY1 = rawY1 * sy + dy;
          const newX2 = rawX2 * sx + dx;
          const newY2 = rawY2 * sy + dy;
          const newX = rawX * sx + dx;
          const newY = rawY * sy + dy;

          parts.push(
            `${newX1.toFixed(2)} ${newY1.toFixed(2)} ${newX2.toFixed(2)} ${newY2.toFixed(2)} ${newX.toFixed(2)} ${newY.toFixed(2)}`
          );
          curX = rawX;
          curY = rawY;
        }
        result += ` C ${parts.join(" ")}`;
        break;
      }
      case "S":
      case "Q": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i += 4) {
          const rawX1 = isRel ? curX + nums[i] : nums[i];
          const rawY1 = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const rawX = isRel ? curX + (nums[i + 2] ?? 0) : (nums[i + 2] ?? 0);
          const rawY = isRel ? curY + (nums[i + 3] ?? 0) : (nums[i + 3] ?? 0);

          const newX1 = rawX1 * sx + dx;
          const newY1 = rawY1 * sy + dy;
          const newX = rawX * sx + dx;
          const newY = rawY * sy + dy;

          parts.push(
            `${newX1.toFixed(2)} ${newY1.toFixed(2)} ${newX.toFixed(2)} ${newY.toFixed(2)}`
          );
          curX = rawX;
          curY = rawY;
        }
        result += ` ${type} ${parts.join(" ")}`;
        break;
      }
      case "T": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i += 2) {
          const rawX = isRel ? curX + nums[i] : nums[i];
          const rawY = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const newX = rawX * sx + dx;
          const newY = rawY * sy + dy;
          parts.push(`${newX.toFixed(2)} ${newY.toFixed(2)}`);
          curX = rawX;
          curY = rawY;
        }
        result += ` T ${parts.join(" ")}`;
        break;
      }
      case "A": {
        const parts: string[] = [];
        for (let i = 0; i < nums.length; i += 7) {
          const rx = nums[i] * sx;
          const ry = (nums[i + 1] ?? nums[i]) * sy;
          const rot = nums[i + 2] ?? 0;
          const large = nums[i + 3] ?? 0;
          const sweep = nums[i + 4] ?? 0;
          const rawX = isRel ? curX + (nums[i + 5] ?? 0) : (nums[i + 5] ?? 0);
          const rawY = isRel ? curY + (nums[i + 6] ?? 0) : (nums[i + 6] ?? 0);
          const newX = rawX * sx + dx;
          const newY = rawY * sy + dy;

          parts.push(
            `${rx.toFixed(2)} ${ry.toFixed(2)} ${rot} ${large} ${sweep} ${newX.toFixed(2)} ${newY.toFixed(2)}`
          );
          curX = rawX;
          curY = rawY;
        }
        result += ` A ${parts.join(" ")}`;
        break;
      }
      case "Z": {
        result += " Z";
        break;
      }
    }
  }

  return result.trim();
}
