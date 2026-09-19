// Zero-dependency studio color conversion utilities
// Supports HEX (#RGB, #RRGBA, #RRGGBB, #RRGGBBAA), RGBA, HSVA, and HSLA

export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface HSVA {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
  a: number; // 0-1
}

export interface HSLA {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

/**
 * Parses any color string (Hex, rgba(), rgb()) into a normalized RGBA object.
 */
export function parseColorToRgba(input: string): RGBA {
  if (!input) return { r: 0, g: 0, b: 0, a: 1 };
  const str = input.trim();

  // Hex format
  if (str.startsWith("#")) {
    const raw = str.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      return { r, g, b, a: 1 };
    }
    if (raw.length === 4) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      const a = parseInt(raw[3] + raw[3], 16) / 255;
      return { r, g, b, a: Number(a.toFixed(2)) };
    }
    if (raw.length === 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
    if (raw.length === 8) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      const a = parseInt(raw.slice(6, 8), 16) / 255;
      return { r, g, b, a: Number(a.toFixed(2)) };
    }
  }

  // rgba(...) or rgb(...)
  const rgbaMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: Math.round(Number(rgbaMatch[1])),
      g: Math.round(Number(rgbaMatch[2])),
      b: Math.round(Number(rgbaMatch[3])),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }

  // Fallback black
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Converts RGBA to 6 or 8 character Hex string.
 */
export function rgbaToHex(
  rOrObj: number | RGBA,
  gOrAlpha?: number | boolean,
  b?: number,
  a = 1
): string {
  let r: number, g: number, bl: number, alpha: number;
  let includeAlphaParam: boolean | undefined;

  if (typeof rOrObj === "object") {
    r = rOrObj.r;
    g = rOrObj.g;
    bl = rOrObj.b;
    alpha = rOrObj.a ?? 1;
    if (typeof gOrAlpha === "boolean") {
      includeAlphaParam = gOrAlpha;
    }
  } else {
    r = rOrObj;
    g = typeof gOrAlpha === "number" ? gOrAlpha : 0;
    bl = b ?? 0;
    alpha = a;
  }

  const clampR = Math.max(0, Math.min(255, Math.round(r)));
  const clampG = Math.max(0, Math.min(255, Math.round(g)));
  const clampB = Math.max(0, Math.min(255, Math.round(bl)));
  const hex = [clampR, clampG, clampB]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

  const shouldIncludeAlpha =
    includeAlphaParam !== undefined ? includeAlphaParam : alpha < 0.999;

  if (shouldIncludeAlpha) {
    const alphaHex = Math.max(0, Math.min(255, Math.round(alpha * 255)))
      .toString(16)
      .padStart(2, "0");
    return `#${hex}${alphaHex}`;
  }
  return `#${hex}`;
}

/**
 * Converts RGB (0-255) to HSV (h: 0-360, s: 0-100, v: 0-100).
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return [h, s, v];
}

/**
 * Converts HSV (h: 0-360, s: 0-100, v: 0-100) to RGB (0-255).
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const sn = s / 100;
  const vn = v / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;

  let rn = 0, gn = 0, bn = 0;
  if (h >= 0 && h < 60) {
    rn = c; gn = x; bn = 0;
  } else if (h >= 60 && h < 120) {
    rn = x; gn = c; bn = 0;
  } else if (h >= 120 && h < 180) {
    rn = 0; gn = c; bn = x;
  } else if (h >= 180 && h < 240) {
    rn = 0; gn = x; bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x; gn = 0; bn = c;
  } else {
    rn = c; gn = 0; bn = x;
  }

  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ];
}

/**
 * Converts RGB to HSL.
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : Math.round((delta / (1 - Math.abs(2 * l - 1))) * 100);

  return [h, s, Math.round(l * 100)];
}

/**
 * Converts HSL to RGB.
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rn = 0, gn = 0, bn = 0;
  if (h >= 0 && h < 60) {
    rn = c; gn = x; bn = 0;
  } else if (h >= 60 && h < 120) {
    rn = x; gn = c; bn = 0;
  } else if (h >= 120 && h < 180) {
    rn = 0; gn = c; bn = x;
  } else if (h >= 180 && h < 240) {
    rn = 0; gn = x; bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x; gn = 0; bn = c;
  } else {
    rn = c; gn = 0; bn = x;
  }

  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ];
}
