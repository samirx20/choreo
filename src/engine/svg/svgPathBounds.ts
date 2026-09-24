/**
 * Analytical SVG Path Bounding Box Calculator
 * Computes minX, minY, maxX, maxY, width, and height for SVG path data.
 * Pure TypeScript, zero external dependencies, works in Node, Browser, and Headless workers.
 */

export interface PathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function computePathBounds(d: string): PathBounds {
  if (!d || typeof d !== "string") {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  let curX = 0;
  let curY = 0;

  const update = (x: number, y: number) => {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  };

  // Match commands and following coordinates
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    // Parse all numbers (allowing decimals, negatives, and scientific notation)
    const nums = argsStr
      .match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
      ?.map(Number) ?? [];

    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    switch (type) {
      case "M":
      case "L": {
        for (let i = 0; i < nums.length; i += 2) {
          const x = isRel ? curX + nums[i] : nums[i];
          const y = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          update(x, y);
          curX = x;
          curY = y;
        }
        break;
      }
      case "H": {
        for (let i = 0; i < nums.length; i++) {
          const x = isRel ? curX + nums[i] : nums[i];
          update(x, curY);
          curX = x;
        }
        break;
      }
      case "V": {
        for (let i = 0; i < nums.length; i++) {
          const y = isRel ? curY + nums[i] : nums[i];
          update(curX, y);
          curY = y;
        }
        break;
      }
      case "C": {
        for (let i = 0; i < nums.length; i += 6) {
          const x1 = isRel ? curX + nums[i] : nums[i];
          const y1 = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const x2 = isRel ? curX + (nums[i + 2] ?? 0) : (nums[i + 2] ?? 0);
          const y2 = isRel ? curY + (nums[i + 3] ?? 0) : (nums[i + 3] ?? 0);
          const x = isRel ? curX + (nums[i + 4] ?? 0) : (nums[i + 4] ?? 0);
          const y = isRel ? curY + (nums[i + 5] ?? 0) : (nums[i + 5] ?? 0);
          update(x1, y1);
          update(x2, y2);
          update(x, y);
          curX = x;
          curY = y;
        }
        break;
      }
      case "S":
      case "Q": {
        for (let i = 0; i < nums.length; i += 4) {
          const x1 = isRel ? curX + nums[i] : nums[i];
          const y1 = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          const x = isRel ? curX + (nums[i + 2] ?? 0) : (nums[i + 2] ?? 0);
          const y = isRel ? curY + (nums[i + 3] ?? 0) : (nums[i + 3] ?? 0);
          update(x1, y1);
          update(x, y);
          curX = x;
          curY = y;
        }
        break;
      }
      case "T": {
        for (let i = 0; i < nums.length; i += 2) {
          const x = isRel ? curX + nums[i] : nums[i];
          const y = isRel ? curY + (nums[i + 1] ?? 0) : (nums[i + 1] ?? 0);
          update(x, y);
          curX = x;
          curY = y;
        }
        break;
      }
      case "A": {
        for (let i = 0; i < nums.length; i += 7) {
          const x = isRel ? curX + (nums[i + 5] ?? 0) : (nums[i + 5] ?? 0);
          const y = isRel ? curY + (nums[i + 6] ?? 0) : (nums[i + 6] ?? 0);
          update(x, y);
          curX = x;
          curY = y;
        }
        break;
      }
      case "Z": {
        // Close path
        break;
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
  };
}
