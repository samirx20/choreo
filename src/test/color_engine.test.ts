import { describe, it, expect } from "vitest";
import {
  parseColorToRgba,
  rgbaToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToHsl,
  hslToRgb,
} from "@/utils/color";

describe("Studio Color Engine Utilities", () => {
  it("parses 6-digit hex colors accurately", () => {
    const rgba = parseColorToRgba("#3b82f6");
    expect(rgba.r).toBe(59);
    expect(rgba.g).toBe(130);
    expect(rgba.b).toBe(246);
    expect(rgba.a).toBe(1);
  });

  it("parses rgb and rgba string representations", () => {
    const rgb = parseColorToRgba("rgb(255, 128, 0)");
    expect(rgb).toEqual({ r: 255, g: 128, b: 0, a: 1 });

    const rgba = parseColorToRgba("rgba(100, 200, 50, 0.5)");
    expect(rgba).toEqual({ r: 100, g: 200, b: 50, a: 0.5 });
  });

  it("converts RGBA to Hex correctly with and without alpha", () => {
    expect(rgbaToHex({ r: 255, g: 255, b: 255, a: 1 }, false)).toBe("#ffffff");
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 }, false)).toBe("#000000");
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 }, true)).toBe("#ff000080");
  });

  it("converts RGB <-> HSV with full fidelity", () => {
    const pureRed = { r: 255, g: 0, b: 0 };
    const [h, s, v] = rgbToHsv(pureRed.r, pureRed.g, pureRed.b);
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(v).toBe(100);

    const [r, g, b] = hsvToRgb(h, s, v);
    expect({ r, g, b }).toEqual(pureRed);
  });

  it("converts RGB <-> HSL correctly", () => {
    const pureGreen = { r: 0, g: 255, b: 0 };
    const [h, s, l] = rgbToHsl(pureGreen.r, pureGreen.g, pureGreen.b);
    expect(h).toBe(120);
    expect(s).toBe(100);
    expect(l).toBe(50);

    const [r, g, b] = hslToRgb(h, s, l);
    expect({ r, g, b }).toEqual(pureGreen);
  });
});
